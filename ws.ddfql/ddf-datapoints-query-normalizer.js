'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const ddfTimeUtils = require('ddf-time-utils');
const ddfQueryUtils = require('./ddf-query-utils');
const constants = require('../ws.utils/constants');

module.exports = {
  normalizeDatapoints,
  normalizeDatapointDdfQuery,
  substituteDatapointConceptsWithIds,
  substituteDatapointJoinLinks
};

function normalizeDatapoints(query, concepts) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const safeConcepts = concepts || [];

  const timeConcepts = _.chain(safeConcepts)
    .filter(_.iteratee(['properties.concept_type', 'time']))
    .map(constants.GID)
    .value();
  const conceptOriginIdsByGids = _.chain(safeConcepts)
    .keyBy(constants.GID)
    .mapValues(constants.ORIGIN_ID)
    .value();

  normalizeDatapointDdfQuery(safeQuery, timeConcepts);
  substituteDatapointConceptsWithIds(safeQuery, conceptOriginIdsByGids);

  return safeQuery;
}

function substituteDatapointJoinLinks(query, linksInJoinToValues) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);

  traverse(safeQuery.where).forEach(function (link) {
    if (safeQuery.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      this.update(id ? {$in: id} : link);
    }
  });
  return safeQuery;
}

function substituteDatapointConceptsWithIds(query, conceptsToIds) {
  traverse(query.where).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query)) {
      const id = conceptsToIds[concept];
      this.update(id ? id : concept);
    }
  });

  traverse(query.join).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query)) {
      const id = conceptsToIds[concept];
      this.update(id ? id : concept);
    }
  });

  return query;
}

function normalizeDatapointDdfQuery(query, timeConcepts) {
  if (_.isEmpty(query.join)) {
    _.set(query, 'join', {});
  }

  normalizeWhere(query);
  normalizeJoin(query, timeConcepts);

  return query;
}

function normalizeWhere(query) {
  let numParsedLinks = 0;

  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isMeasureFilter(this.key, query)) {
      normalizedFilter = {
        measure: this.key,
        value: filterValue
      };
    }

    if (isEntityFilter(this.key, query)) {
      const join = _.get(query, 'join', {});
      const isUsedExistedLink = _.startsWith(filterValue, '$') && join.hasOwnProperty(filterValue);

      if (isUsedExistedLink) {
        normalizedFilter = {
          dimensions: filterValue,
        };
      } else {
        numParsedLinks++;
        const joinLink = `$parsed_${this.key}_${numParsedLinks}`;

        query.join[joinLink] = {
          key: this.key,
          where: {[this.key]: filterValue}
        };

        normalizedFilter = {
          dimensions: joinLink
        };
      }
    }

    if (normalizedFilter) {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.where
      });
    }
  });

  const subWhere = query.where;

  query.where = {
    $and: [
      {dimensions: {$size: _.size(query.select.key)}}
    ]
  };

  if (!_.isEmpty(subWhere)) {
    query.where.$and.push(subWhere);
  }
}

function normalizeJoin(query, timeConcepts) {
  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isEntityFilter(this.key, query)) {
      if (_.includes(timeConcepts, this.key)) {

        let timeType = '';
        normalizedFilter = {
          [`parsedProperties.${this.key}.millis`]: traverse(filterValue).map(function (value) {
            if (this.notLeaf) {
              return value;
            }

            const timeDescriptor = ddfTimeUtils.parseTime(value);
            timeType = timeDescriptor.type;
            return timeDescriptor.time;
          })
        };

        // always set latest detected time type
        const conditionsForTimeEntities = _.get(query.join, this.path.slice(0, this.path.length - 1));
        conditionsForTimeEntities[`parsedProperties.${this.key}.timeType`] = timeType;
      } else {
        normalizedFilter = {
          gid: filterValue
        };
      }
    }

    if (isEntityPropertyFilter(this.key, query)) {
      if (_.includes(this.path, 'where')) {
        // TODO: `^${domainKey}\.` is just hack for temporary support of current query from Vizabi. It will be removed.
        let domainPath = _.slice(this.path, 0, this.path.indexOf('where')).concat(['domain']);
        const domainKey = _.get(query.join, domainPath);

        const key = this.key.replace(new RegExp(`^${domainKey}\.`), '');
        normalizedFilter = {
          [`properties.${key}`]: filterValue,
        };
      }
    }

    if (this.key === 'key') {
      if (_.includes(timeConcepts, filterValue)) {
        normalizedFilter = {
          domain: filterValue,
        };
      } else {
        normalizedFilter = {
          domain: filterValue,
        };
      }
    }

    if (normalizedFilter) {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.join
      });
    }
  });

  pullUpWhereSectionsInJoin(query);
}

function pullUpWhereSectionsInJoin(query) {
  traverse(query.join).forEach(function () {
    if (this.key === 'where') {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        queryFragment: query.join,
        substituteEntryWithItsContent: true
      });
    }
  });
}

function isMeasureFilter(key, query) {
  return _.includes(query.select.value, key);
}

function isEntityFilter(key, query) {
  return _.includes(query.select.key, key);
}

function isEntityPropertyFilter(key, query) {
  // const concept = _.head(_.split(key, '.'));
  // return _.includes(query.select.key, concept) && _.includes(key, `${concept}.`);
  return !isEntityFilter(key, query) && !isOperator(key) && isNaN(Number(key));
}

function isOperator(key) {
  return _.startsWith(key, '$') || _.includes(['key', 'where'], key);
}

function shouldSubstituteValueWithId(value, query) {
  return isEntityFilter(value, query) || isMeasureFilter(value, query);
}
