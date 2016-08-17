'use strict';

import test from 'ava';
import ddfQueryNormalizer from './ddf-query-normalizer';

test('should normalize where and join clauses', assert => {
  const ddfql = {
    "select": {
      "key": ["geo", "time"],
      "value": [
        "population", "life_expectancy", "gdp_per_cap", "gov_type"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"geo": "$geo"},
        {"time": "$time"},
        {
          "$or": [
            {"population": {"$gt": 100000}, "time": "$time2"},
            {"life_expectancy": {"$gt": 30, "$lt": 70}},
            {"gdp_per_cap": {"$gt": 600, "$lt": 500}},
            {"gdp_per_cap": {"$gt": 1000}}
          ]
        }
      ]
    },
    "join": {
      "$geo": {
        key: "geo",
        where: {
          "$and": [
            {"is--country": true},
            {"latitude": {"$lte": 0}}
          ]
        }
      },
      "$time": {
        key: "time",
        where: {
          "time": {"$lt": 2015}
        }
      },
      "$time2": {
        key: "time",
        where: {
          "time": {"$eq": 1918}
        }
      }
    }
  };

  const normalizedDdfql = {
    "select": {
      "key": ["geo", "time"],
      "value": [
        "population", "life_expectancy", "gdp_per_cap", "gov_type"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"dimensions": {"$size": 2}},
        {
          "$and": [
            {"dimensions": "$geo"},
            {"dimensions": "$time"},
            {
              "$or": [
                {
                  "measure": "population",
                  "value": {"$gt": 100000},
                  "dimensions": "$time2"
                },
                {
                  "measure": "life_expectancy",
                  "value": {"$gt": 30, "$lt": 70}
                },
                {
                  "measure": "gdp_per_cap",
                  "value": {"$gt": 600, "$lt": 500}
                },
                {
                  "measure": "gdp_per_cap",
                  "value": {"$gt": 1000}
                }
              ]
            }
          ]
        }
      ]
    },
    "join": {
      "$geo": {
        "domain": "geo",
        "$and": [
          {"properties.is--country": true},
          {"properties.latitude": {"$lte": 0}}
        ]
      },
      "$time": {
        "domain": "time",
        "gid": {"$lt": 2015}
      },
      "$time2": {
        "domain": "time",
        "gid": {"$eq": 1918}
      }
    }
  };

  assert.deepEqual(ddfQueryNormalizer.normalizeDdfQuery(ddfql), normalizedDdfql);
});

test('should substitute concept placeholders with ids', assert => {
  const conceptsToIds = {
    geo: "17a3470d3a8c9b37009b9bf9",
    time: "27a3470d3a8c9b37009b9bf9",
    population: "37a3470d3a8c9b37009b9bf9",
    life_expectancy: "47a3470d3a8c9b37009b9bf9",
    gdp_per_cap: "57a3470d3a8c9b37009b9bf9",
    gov_type: "67a3470d3a8c9b37009b9bf9",
  };

  const normalizedDdfql = {
    "select": {
      "key": ["geo", "time"],
      "value": [
        "population", "life_expectancy", "gdp_per_cap", "gov_type"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"dimensions": {"$size": 2}},
        {
          "$and": [
            {"dimensions": "$geo"},
            {"dimensions": "$time"},
            {
              "$or": [
                {
                  "measure": "population",
                  "value": {"$gt": 100000},
                  "dimensions": "$time2"
                },
                {
                  "measure": "life_expectancy",
                  "value": {"$gt": 30, "$lt": 70}
                },
                {
                  "measure": "gdp_per_cap",
                  "value": {"$gt": 600, "$lt": 500}
                },
                {
                  "measure": "gdp_per_cap",
                  "value": {"$gt": 1000}
                }
              ]
            }
          ]
        }
      ]
    },
    "join": {
      "$geo": {
        "domain": "geo",
        "$and": [
          {"properties.is--country": true},
          {"properties.latitude": {"$lte": 0}}
        ]
      },
      "$time": {
        "domain": "time",
        "gid": {"$lt": 2015}
      },
      "$time2": {
        "domain": "time",
        "gid": {"$eq": 1918}
      }
    }
  };

  const normalizedDdfqlWithSubstitutedConcepts = {
    "select": {
      "key": ["geo", "time"],
      "value": [
        "population", "life_expectancy", "gdp_per_cap", "gov_type"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"dimensions": {"$size": 2}},
        {
          "$and": [
            {"dimensions": "$geo"},
            {"dimensions": "$time"},
            {
              "$or": [
                {
                  "measure": "37a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 100000},
                  "dimensions": "$time2"
                },
                {
                  "measure": "47a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 30, "$lt": 70}
                },
                {
                  "measure": "57a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 600, "$lt": 500}
                },
                {
                  "measure": "57a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 1000}
                }
              ]
            }
          ]
        }
      ]
    },
    "join": {
      "$geo": {
        "domain": "17a3470d3a8c9b37009b9bf9",
        "$and": [
          {"properties.is--country": true},
          {"properties.latitude": {"$lte": 0}}
        ]
      },
      "$time": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "gid": {"$lt": 2015}
      },
      "$time2": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "gid": {"$eq": 1918}
      }
    }
  };

  assert.deepEqual(ddfQueryNormalizer.substituteConceptsWithIds(normalizedDdfql, conceptsToIds), normalizedDdfqlWithSubstitutedConcepts);
});


test('should substitute join link in where clause', assert => {
  const linksInJoinToValues = {
    $geo: [
      "27a3470d3a8c9b37009b9bf9",
      "27a3470d3a8c9b37009b9bf9",
      "27a3470d3a8c9b37009b9bf9"
    ],
    $time: [
      "47a3470d3a8c9b37009b9bf9",
      "47a3470d3a8c9b37009b9bf9",
      "47a3470d3a8c9b37009b9bf9"
    ],
    $time2: [
      "67a3470d3a8c9b37009b9bf9",
      "67a3470d3a8c9b37009b9bf9",
      "67a3470d3a8c9b37009b9bf9"
    ],
  };

  const normalizedDdfql = {
    "select": {
      "key": ["geo", "time"],
      "value": [
        "population", "life_expectancy", "gdp_per_cap", "gov_type"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"dimensions": {"$size": 2}},
        {
          "$and": [
            {
              "dimensions": "$geo"
            },
            {
              "dimensions": "$time"
            },
            {
              "$or": [
                {
                  "measure": "37a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 100000},
                  "dimensions": "$time2"
                },
                {
                  "measure": "47a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 30, "$lt": 70}
                },
                {
                  "measure": "57a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 600, "$lt": 500}
                },
                {
                  "measure": "57a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 1000}
                }
              ]
            }
          ]
        }
      ]
    },
    "join": {
      "$geo": {
        "domain": "17a3470d3a8c9b37009b9bf9",
        "$and": [
          {"properties.is--country": true},
          {"properties.latitude": {"$lte": 0}}
        ]
      },
      "$time": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "gid": {"$lt": 2015}
      },
      "$time2": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "gid": {"$eq": 1918}
      }
    }
  };

  const normalizedDdfqlWithSubstitutedJoinLinks = {
    "select": {
      "key": ["geo", "time"],
      "value": [
        "population", "life_expectancy", "gdp_per_cap", "gov_type"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"dimensions": {"$size": 2}},
        {
          "$and": [
            {
              "dimensions": {
                "$in": [
                  "27a3470d3a8c9b37009b9bf9",
                  "27a3470d3a8c9b37009b9bf9",
                  "27a3470d3a8c9b37009b9bf9"
                ]
              }
            },
            {
              "dimensions": {
                "$in": [
                  "47a3470d3a8c9b37009b9bf9",
                  "47a3470d3a8c9b37009b9bf9",
                  "47a3470d3a8c9b37009b9bf9"
                ]
              }
            },
            {
              "$or": [
                {
                  "measure": "37a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 100000},
                  "dimensions": {
                    "$in": [
                      "67a3470d3a8c9b37009b9bf9",
                      "67a3470d3a8c9b37009b9bf9",
                      "67a3470d3a8c9b37009b9bf9"
                    ]
                  }
                },
                {
                  "measure": "47a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 30, "$lt": 70}
                },
                {
                  "measure": "57a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 600, "$lt": 500}
                },
                {
                  "measure": "57a3470d3a8c9b37009b9bf9",
                  "value": {"$gt": 1000}
                }
              ]
            }
          ]
        }
      ]
    },
    "join": {
      "$geo": {
        "domain": "17a3470d3a8c9b37009b9bf9",
        "$and": [
          {"properties.is--country": true},
          {"properties.latitude": {"$lte": 0}}
        ]
      },
      "$time": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "gid": {"$lt": 2015}
      },
      "$time2": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "gid": {"$eq": 1918}
      }
    }
  };

  assert.deepEqual(ddfQueryNormalizer.substituteJoinLinks(normalizedDdfql, linksInJoinToValues), normalizedDdfqlWithSubstitutedJoinLinks);
});
