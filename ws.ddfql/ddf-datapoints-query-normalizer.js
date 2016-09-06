'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const ddfTimeUtils = require('ddf-time-utils');

module.exports = {
  normalizeDatapoints: normalizeDatapoints,
  normalizeDatapointDdfQuery: normalizeDatapointDdfQuery,
  substituteDatapointConceptsWithIds: substituteDatapointConceptsWithIds,
  substituteDatapointJoinLinks: substituteDatapointJoinLinks
};

function normalizeDatapoints(query, conceptsToIds, timeConcepts) {
  normalizeDatapointDdfQuery(query, timeConcepts);
  substituteDatapointConceptsWithIds(query, conceptsToIds);
  return query;
}

function substituteDatapointJoinLinks(query, linksInJoinToValues) {
  traverse(query.where).forEach(function (link) {
    if (query.join && query.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      this.update(id ? {$in: id} : link);
    }
  });
  return query;
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
  normalizeWhere(query);
  normalizeJoin(query, timeConcepts);
  return query;
}

function normalizeWhere(query) {
  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isMeasureFilter(this.key, query)) {
      normalizedFilter = {
        measure: this.key,
        value: filterValue
      };
    }

    if (isEntityFilter(this.key, query)) {
      normalizedFilter = {
        dimensions: filterValue,
      };
    }

    if (normalizedFilter) {
      replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.where
      });
    }
  });

  query.where = {
    $and: [
      {dimensions: {$size: _.size(query.select.key)}},
      query.where
    ]
  };
}

function normalizeJoin(query, timeConcepts) {
  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isEntityFilter(this.key, query)) {
      if (_.includes(timeConcepts, this.key)) {

        let timeType = '';
        normalizedFilter = {
          millis: traverse(filterValue).map(function (value) {
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
        _.set(conditionsForTimeEntities, 'timeType', timeType);
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
      normalizedFilter = {
        domain: filterValue,
      };
    }

    if (normalizedFilter) {
      replaceValueOnPath({
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
      replaceValueOnPath({
        key: this.key,
        path: this.path,
        queryFragment: query.join,
        substituteEntryWithItsContent: true
      });
    }
  });
}

function replaceValueOnPath(options) {
  // we need to do a step back in path
  options.path.pop();
  const path = options.path;

  const key = options.key;
  const normalizedValue = options.normalizedValue;
  const queryFragment = options.queryFragment;

  const value = _.get(queryFragment, path);

  if (options.substituteEntryWithItsContent) {
    const content = value[key];
    delete value[key];
    _.merge(value, content);
  } else {
    delete value[key];
    _.set(queryFragment, path, _.merge(value, normalizedValue));
  }
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
