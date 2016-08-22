'use strict';

import test from 'ava';
import schemaQueryNormalizer from './ddf-schema-query-normalizer';

test('should normalize schema where clause - For the dimensions geo and year, what indicators are available?', assert => {
  const schemaDdfql = {
    "select": {
      "key": ["key","value"]
    },
    "from": "datapoints.schema",
    "where": {
      "key": ["geo","year"]
    },
    "aliases": {}
  };

  const normalizedSchemaDdfql = {
    "select": {
      "key" : 1,
      "value": 1
    },
    "from": "datapoints.schema",
    "where": {
      "$and": [
        {"type": "datapoints"},
        {"key": ["geo","year"]}
      ]
    },
    "aliases": {}
  };

  assert.deepEqual(schemaQueryNormalizer.normalize(schemaDdfql), normalizedSchemaDdfql);
});

test('should normalize schema where clause - In what dimensionality can I get population?', assert => {
  const schemaDdfql = {
    "select": {
      "key": ["key","value"]
    },
    "from": "datapoints.schema",
    "where": {
      "value": "population"
    },
    "aliases": {}
  };

  const normalizedSchemaDdfql = {
    "select": {
      "key" : 1,
      "value": 1
    },
    "from": "datapoints.schema",
    "where": {
      "$and": [
        {"type": "datapoints"},
        {"value": "population"}
      ]
    },
    "aliases": {}
  };

  assert.deepEqual(schemaQueryNormalizer.normalize(schemaDdfql), normalizedSchemaDdfql);
});

test('should normalize schema where clause - What entity properties are available for geo?', assert => {
  const schemaDdfql = {
    "select": {
      "key": ["key","value"]
    },
    "from": "entities.schema",
    "where": {
      "key": ["geo"]
    },
    "aliases": {}
  };

  const normalizedSchemaDdfql = {
    "select": {
      "key" : 1,
      "value": 1
    },
    "from": "entities.schema",
    "where": {
      "$and": [
        {"type": "entities"},
        {"key": ["geo"]}
      ]
    },
    "aliases": {}
  };

  assert.deepEqual(schemaQueryNormalizer.normalize(schemaDdfql), normalizedSchemaDdfql);
});

test('should normalize schema where clause - What concept properties are available in the dataset?', assert => {
  const schemaDdfql = {
    "select": {
      "key": ["key","value"]
    },
    "from": "concepts.schema",
    "aliases": {}
  };

  const normalizedSchemaDdfql = {
    "select": {
      "key" : 1,
      "value": 1
    },
    "from": "concepts.schema",
    "where": {
      "$and": [
        {"type": "concepts"},
      ]
    },
    "aliases": {}
  };

  assert.deepEqual(schemaQueryNormalizer.normalize(schemaDdfql), normalizedSchemaDdfql);
});

test('should normalize schema where clause that contains functions - What datapoints does this dataset have and what are their indicators min and max values?', assert => {
  const schemaDdfql = {
    "select": {
      "key": ["key","value"],
      "value": ["min(value)","max(value)"]
    },
    "from": "datapoints.schema",
    "aliases": {}
  };

  const normalizedSchemaDdfql = {
    "select": { "key": 1, "value": 1, "min": 1, "max": 1 },
    "from": "datapoints.schema",
    "where": {
      "$and": [
        {"type": "datapoints"},
      ]
    },
    "aliases": {
      "min": "min(value)",
      "max": "max(value)"
    }
  };

  assert.deepEqual(schemaQueryNormalizer.normalize(schemaDdfql), normalizedSchemaDdfql);
});
