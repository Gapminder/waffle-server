'use strict';

const _ = require('lodash');
const async = require('async');
const express = require('express');
const mongoose = require('mongoose');

const exportUtils = require('./export.utils');
const makeBatchNode = exportUtils.makeBatchNode;
const makeBatchRelation = exportUtils.makeBatchRelation;
const makeBatchIdBasedRelation = exportUtils.makeBatchIdBasedRelation;

module.exports = (app, done, options = {}) => {
  const neo4jdb = app.get('neo4jDb');
  const logger = app.get('log');

  const config = app.get('config');

  const version = options.EXPORT_TO_VERSION || config.EXPORT_TO_VERSION;
  const datasetName = options.DATASET_NAME || config.DATASET_NAME;

  console.time('Ddf data tree exporting is completed.');
  async.waterfall([
    async.constant({}),
    exportDataset,
    exportIndicators,
    exportDimensions,
    exportDimensionValues,
    exportIndicatorValues,
    createIndexes
  ], function (err) {
  if (err) {
      logger.error(err);
      return done(err);
    }
    console.timeEnd('Ddf data tree exporting is completed.');
    return done(null);
  });

  function exportDataset(pipe, onDatasetExported) {
    const Datasets = mongoose.model('Datasets');

    async.waterfall([
        done => Datasets.findOne({name: datasetName}).lean().exec(done),
        (dataset, done) => {
          pipe.dataset = dataset;

          if (!dataset) {
            return done(`There is no dataset with name "${datasetName}"`);
          }

          pipe.currentVersion = Number(version) || Number(_.first(dataset.versions));

          if (!pipe.currentVersion) {
            return done(`There is no version to import for dataset "${datasetName}"`);
          }
          
          let batchQueryId = 0;
          let batchNode = makeBatchNode({
            id: batchQueryId,
            labelName: 'Dataset',
            body: {name: dataset.name, originId: dataset._id.toString()}
          });

          return neo4jdb.batchQuery(batchNode, function (err, datasetNodes) {
            const dsIdToNeoId = datasetNodes.reduce((result, next) => {
              if (!next.body) {
                return result;
              }

              result[pipe.dataset._id.toString()] = next.body.metadata.id;
              return result;
            }, {});
            pipe.dataset.neoId = dsIdToNeoId[pipe.dataset._id.toString()];
            return done(err);
          });
        }
      ],
      error => {
        onDatasetExported(error, pipe);
      });
  }

  function exportIndicators(pipe, onIndicatorsExported) {
    console.log('Indicators export started');
    console.time('Indicators exported');
    var Concepts = mongoose.model('Concepts');
    async.waterfall([
      done => Concepts.find({type: 'measure', dataset: pipe.dataset._id, from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}}, {gid: 1, originId: 1, dimensions: 1}).lean().exec(done),
      (indicators, done) => {
        console.log('Exporting %s indicators', indicators.length);
        pipe.indicators = indicators;

        let batchQueryId = 0;
        const batchQuery = _.map(indicators, indicator => {
          let batchNode = makeBatchNode({
            id: batchQueryId,
            labelName: 'Indicators',
            body: {originId: indicator.originId.toString()}
          });

          batchNode.push(makeBatchRelation({
            fromNodeId: pipe.dataset.neoId,
            toNodeId: `{${batchQueryId}}`,
            relationName: 'WITH_INDICATOR',
            from: pipe.currentVersion
          }));

          batchQueryId += 2;
          return batchNode;
        });

        return neo4jdb.batchQuery(batchQuery, (error, indicatorNodes) => {
          const indicatorNodesByOriginId = _.chain(indicatorNodes)
            .filter(node => node.body)
            .keyBy(node => node.body.data.originId)
            .mapValues(node => node.body.metadata.id)
            .value();

          _.each(pipe.indicators, indicator => {
            indicator.neoId = indicatorNodesByOriginId[indicator.originId.toString()];
          });

          return done(error, indicatorNodes);
        });
      }
    ], error => {
      console.timeEnd('Indicators exported');
      onIndicatorsExported(error, pipe);
    });
  }

  function exportDimensions(pipe, onDimensionsExported) {
    console.log("Dimensions export started");
    console.time("Dimensions exported");
    var Concepts = mongoose.model('Concepts');
    async.waterfall([
      done => {
        const projection = {originId: 1};
        const query = {dataset: pipe.dataset._id, $or: [{type: 'entity_set'}, {type: 'entity_domain'}], from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}};

        return Concepts.find(query, projection).lean().exec((error, dimensions) => {
          if (error) {
            return done(error);
          }

          return done(null, _.keyBy(dimensions, dimension => dimension.originId.toString()));
        });
      },
      (dimensions, done) => {
        let batchQueryId = 0;
        const batchQuery = _.map(pipe.indicators, indicator => {
          return _.map(indicator.dimensions, dimensionObjectId => {
            // create indicator dimension node
            var dimension = dimensions[dimensionObjectId.toString()];

            let batchNode = makeBatchNode({
              id: batchQueryId,
              labelName: 'Dimensions',
              body: {originId: dimension.originId.toString()}
            });

            batchNode.push(makeBatchRelation({
              fromNodeId: indicator.neoId,
              toNodeId: `{${batchQueryId}}`,
              relationName: 'WITH_DIMENSION',
              from: pipe.currentVersion
            }));

            batchQueryId += 2;
            return batchNode;
          });
        });

        return neo4jdb.batchQuery(batchQuery, error => {
          console.timeEnd("Dimensions exported");
          return done(error);
        });
      }
    ], err => onDimensionsExported(err, pipe));
  }

  function exportDimensionValues(pipe, onDimensionValuesExported) {
    const IndicatorValues = mongoose.model('DataPoints');
    const Entities = mongoose.model('Entities');

    async.eachSeries(pipe.indicators, (indicator, onDimensionValuesForIndicatorExported) => {
      console.time(`DimensionValues exported for indicator '${indicator.gid}'`);

      async.waterfall([
        done => neo4jdb.cypherQuery(`MATCH (:Indicators {originId: '${indicator.originId.toString()}'})-[:WITH_DIMENSION]->(d:Dimensions) RETURN id(d), d.originId`, (error, response) => {
          const dimensionOriginIdToNeoId = _.reduce(response.data, (result, row) => {
            result[row[1]] = row[0];
            return result
          }, {});
          done(null, dimensionOriginIdToNeoId)
        }),
        (dimensionOriginIdToNeoId, done) => IndicatorValues.distinct('dimensions', {dataset: pipe.dataset._id, measure: indicator.originId, from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}}).lean().exec((error, coordinates) => {
          return Entities.find({originId: {$in: coordinates}, dataset: pipe.dataset._id, from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}}, {sets: 1, domain: 1, originId: 1}).lean().exec((error, entities) => {
          if (!coordinates.length) {
            return onDimensionValuesForIndicatorExported();
          }

          let batchQueryId = 0;
          const batchQuery = _.map(entities, dimValue => {

            let batchNode = [];
            _(dimValue.sets ? dimValue.sets : [])
              .concat([dimValue.domain])
              .map(coord => coord.toString())
              .uniq()
              .forEach(coord => {
                batchNode.push(makeBatchNode({
                  id: batchQueryId,
                  labelName: 'DimensionValues',
                  body: {originId: dimValue.originId.toString()}
                }));

                batchNode.push(makeBatchRelation({
                  fromNodeId: dimensionOriginIdToNeoId[coord],
                  toNodeId: `{${batchQueryId}}`,
                  relationName: 'WITH_DIMENSION_VALUE',
                  from: pipe.currentVersion
                }));

                batchQueryId += 2;
              });

            batchQueryId += 2;
            return batchNode;
          });

          return neo4jdb.batchQuery(batchQuery, error => {
            console.timeEnd(`DimensionValues exported for indicator '${indicator.gid}'`);
            return onDimensionValuesForIndicatorExported(error);
          });
        })})
      ], onDimensionValuesForIndicatorExported);
    }, error => {
      onDimensionValuesExported(error, pipe)
    });
  }

  function exportIndicatorValues(pipe, onIndicatorValuesExported) {
    const IndicatorValues = mongoose.model('DataPoints');

    return async.eachSeries(pipe.indicators, (indicator, escb) => {

	  console.log(`Exporting of '${indicator.gid}' measure values STARTED`);
      console.time(`Exporting of '${indicator.gid}' measure values DONE`);

      return async.parallel({
        dimensionsWithValuesPerIndicator: done => {
          const query = `
                MATCH (:Indicators {originId:'${indicator.originId}'})-->(dimension:Dimensions)-->(dimensionValue:DimensionValues) 
                RETURN 
                  id(dimension),
                  dimension.originId,
                  id(dimensionValue),
                  dimensionValue.originId`;

          return neo4jdb.cypherQuery(query, (error, response) => {
            if (error) {
              return done(error);
            }

            return done(null, _.reduce(response.data, (result, row)=> {
              const dimensionOriginId = row[1];
              const dimensionValueNeoId = row[2];
              const dimensionValueOriginId = row[3];

              result[dimensionOriginId] = result[dimensionOriginId] || {};
              result[dimensionOriginId][dimensionValueOriginId] = dimensionValueNeoId;
              return result;
            }, {}));
          });
        },
        amountOfDatapointsPerIndicator: done => IndicatorValues.count({measure: indicator.originId}, done)
      }, (err, indicatorMetadata) => {
        if (err || !indicatorMetadata.amountOfDatapointsPerIndicator) {
          return escb(err);
        }

        const pagingTasks = makePagingTasks(indicatorMetadata.amountOfDatapointsPerIndicator);
        let counter = pagingTasks.pages;

        console.log(`${indicator.gid} values to save: ${counter}`);

        async.eachSeries(pagingTasks.tasks, (task, done) => {
          let currentCounter = counter--;

          console.time(`${indicator.gid} values left to save: ${currentCounter}`);

          IndicatorValues.find({dataset: pipe.dataset._id, measure: indicator.originId, from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}}, {
            value: 1,
            dimensions: 1,
            measure: 1,
            originId: 1,
            isNumeric: 1
          }, {join: {
              measure: {
                $find: {
                  dataset: pipe.dataset._id,
                  from: {$lte: pipe.currentVersion},
                  to: {$gt: pipe.currentVersion}
                }
              },
              dimensions: {
                $find: {
                  dataset: pipe.dataset._id,
                  from: {$lte: pipe.currentVersion},
                  to: {$gt: pipe.currentVersion}
                }
              }
          }}).skip(task.skip).limit(task.limit).lean().exec((err, indicatorValues) => {

            let batchQueryId = 0;
            const batchQuery = _.map(indicatorValues, indicatorValue => {
              let batchNode = makeBatchNode({
                id: batchQueryId,
                labelName: 'IndicatorValues',
                body: {originId: indicatorValue.originId.toString()}
              });

              _.each(indicatorValue.dimensions, coordinate => {
                const concepts = _.chain([coordinate.domain, ...coordinate.sets])
                  .map(_.toString)
                  .uniq()
                  .value();

                _.each(concepts, concept => {
                  const nodeId =
                    indicatorMetadata.dimensionsWithValuesPerIndicator[concept][coordinate.originId.toString()] ||
                    indicatorMetadata.dimensionsWithValuesPerIndicator[concept][null];

                  batchNode.push(makeBatchRelation({
                    fromNodeId: nodeId,
                    toNodeId: `{${batchQueryId}}`,
                    relationName: 'WITH_INDICATOR_VALUE',
                    from: pipe.currentVersion
                  }));
                });
              });

              const indicatorValueNodeBatchId = batchQueryId;
              batchQueryId += 2;
              batchNode.push(makeBatchNode({
                id: batchQueryId,
                labelName: 'IndicatorValueState',
                body: {value: indicatorValue.value, isNumeric: indicatorValue.isNumeric, originId: indicatorValue.originId.toString()}
              }));

              batchNode.push(makeBatchIdBasedRelation({
                fromNodeId: `{${indicatorValueNodeBatchId}}`,
                toNodeId: `{${batchQueryId}}`,
                relationName: 'WITH_INDICATOR_VALUE_STATE',
                from: pipe.currentVersion
              }));

              batchQueryId += 2;
              return batchNode;
            });

            let retries = 0;
            followTheWhiteRabbit();
            function followTheWhiteRabbit() {
              return neo4jdb.batchQuery(batchQuery, error => {
                if (error && retries++ < 4) {
                  console.log('Retry: ' + retries);
                  return setTimeout(followTheWhiteRabbit, 500);
                }

                if (error) {
                  return done(error);
                }

                console.timeEnd(`${indicator.gid} values left to save: ${currentCounter}`);
                done(error, pipe);
              });
            }
          });
        }, error => {
          console.timeEnd(`Exporting of '${indicator.gid}' measure values DONE`);
          return escb(error, pipe);
        });
      });
    }, error => {
      if (error) {
        return onIndicatorValuesExported(error);
      }

      onIndicatorValuesExported(error, pipe);
    });
  }

  function makePagingTasks(amountOfRecords) {
    const tasks = [];
    const page = 1500;
    const pages = Math.floor((amountOfRecords) / page);
    const lastPage = (amountOfRecords) % page;

    let i;
    for (i = 0; i < pages; i++) {
      tasks.push({skip: i * page, limit: page});
    }

    tasks.push({skip: i * page, limit: lastPage});
    return {tasks: tasks, pages: pages + 1};
  }

  function createIndexes(pipe, onIndexesCreated) {
    async.eachSeries([
      'create index on :Indicators(originId)',
      'create index on :Dimensions(originId)',
      'create index on :DimensionValues(originId)',
      'create index on :IndicatorValues(originId)',
      'create index on :IndicatorValueState(originId)'
    ], function (query, done) {
      console.time(query);
      return neo4jdb.cypherQuery(query, {}, error => {
        console.timeEnd(query);
        return done(error);
      });
    }, error => onIndexesCreated(error, pipe));
  }
};
