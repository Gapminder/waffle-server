'use strict';

const chai = require('chai');
const ddfQueryNormalizer = require('./ddf-datapoints-query-normalizer');

const expect = chai.expect;

it('should normalize where and join clauses', () => {
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
        "key": "geo",
        "where": {
          "$and": [
            {"geo.is--country": true},
            {"latitude": {"$lte": 0}}
          ]
        }
      },
      "$time": {
        "key": "time",
        "where": {
          "time": {"$lt": 2015}
        }
      },
      "$time2": {
        "key": "time",
        "where": {
          "time": {"$eq": 1918}
        }
      }
    },
    "order_by": ["geo", {"time": "asc"}]
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
        {"measure": {"$in": ["population", "life_expectancy", "gdp_per_cap", "gov_type"]}},
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
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {
          "$lt": 1420070400000
        }
      },
      "$time2": {
        "domain": "time",
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {
          "$eq": -1640995200000
        }
      }
    },
    "order_by": [{"geo": "asc"}, {"time": "asc"}]
  };

  expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, ['time'])).to.deep.equal(normalizedDdfql);
});

it('should normalize where and join clauses - QUARTER time type should be parsed', () => {
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
        {"time": "$time"},
      ]
    },
    "join": {
      "$time": {
        "key": "time",
        "where": {
          "time": {"$lt": '2015q3'}
        }
      },
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
        {"measure": {"$in": ["population", "life_expectancy", "gdp_per_cap", "gov_type"]}},
        {
          "$and": [
            {"dimensions": "$time"},
          ]
        }
      ]
    },
    "join": {
      "$time": {
        "domain": "time",
        "parsedProperties.time.timeType": "QUARTER_TYPE",
        "parsedProperties.time.millis": {"$lt": 1435708800000}
      }
    }
  };

  expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, ['time'])).to.deep.equal(normalizedDdfql);
});

it('should normalize where and join clauses - YEAR time type should be parsed', () => {
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
        {"time": "$time"},
      ]
    },
    "join": {
      "$time": {
        "key": "time",
        "where": {
          "time": {"$lt": '2015'}
        }
      },
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
        {"measure": {"$in": ["population", "life_expectancy", "gdp_per_cap", "gov_type"]}},
        {
          "$and": [
            {"dimensions": "$time"}
          ]
        }
      ]
    },
    "join": {
      "$time": {
        "domain": "time",
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$lt": 1420070400000}
      }
    }
  };

  expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, ['time'])).to.deep.equal(normalizedDdfql);
});

it('should normalize where and join clauses - WEEK time type should be parsed', () => {
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
        {"time": "$time"},
      ]
    },
    "join": {
      "$time": {
        "key": "time",
        "where": {
          "$and": [{"time": {"$lt": "2015w5"}}, {"time": {"$gt": "2015w2"}}]
        }
      },
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
        {"measure": {"$in": ["population", "life_expectancy", "gdp_per_cap", "gov_type"]}},
        {
          "$and": [
            {"dimensions": "$time"}
          ]
        }
      ]
    },
    "join": {
      "$time": {
        "domain": "time",
        "$and": [
          {
            "parsedProperties.time.timeType": "WEEK_TYPE",
            "parsedProperties.time.millis": {
              "$lt": 1422230400000
            }
          },
          {
            "parsedProperties.time.timeType": "WEEK_TYPE",
            "parsedProperties.time.millis": {
              "$gt": 1420416000000
            }
          }
        ]
      }
    }
  };

  expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, ['time'])).to.deep.equal(normalizedDdfql);
});

it('should normalize where and join clauses - DATE time type should be parsed', () => {
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
        {"time": "$time"},
      ]
    },
    "join": {
      "$time": {
        "key": "time",
        "where": {
          "time": {"$and": [{"$lt": "20151201"}, {"$gt": "20130901"}]}
        }
      },
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
        {"measure": {"$in": ["population", "life_expectancy", "gdp_per_cap", "gov_type"]}},
        {
          "$and": [
            {"dimensions": "$time"}
          ]
        }
      ]
    },
    "join": {
      "$time": {
        "domain": "time",
        "parsedProperties.time.timeType": "DATE_TYPE",
        "parsedProperties.time.millis": {
          "$and": [
            {
              "$lt": 1448928000000
            },
            {
              "$gt": 1377993600000
            }
          ]
        }
      }
    }
  };

  expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, ['time'])).to.deep.equal(normalizedDdfql);
});

it('should substitute concept placeholders with ids', () => {
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
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$lt": 1377993600000}
      },
      "$time2": {
        "domain": "time",
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$eq": 1377993600000}
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
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$lt": 1377993600000}
      },
      "$time2": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$eq": 1377993600000}
      }
    }
  };

  expect(ddfQueryNormalizer.substituteDatapointConceptsWithIds(normalizedDdfql, conceptsToIds)).to.deep.equal(normalizedDdfqlWithSubstitutedConcepts);
});

it('should substitute join link in where clause', () => {
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
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$lt": 1377993600000}
      },
      "$time2": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$eq": 1377993600000}
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
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$lt": 1377993600000}
      },
      "$time2": {
        "domain": "27a3470d3a8c9b37009b9bf9",
        "parsedProperties.time.timeType": "YEAR_TYPE",
        "parsedProperties.time.millis": {"$eq": 1377993600000}
      }
    },
    "order_by": []
  };

  expect(ddfQueryNormalizer.substituteDatapointJoinLinks(normalizedDdfql, linksInJoinToValues)).to.deep.equal(normalizedDdfqlWithSubstitutedJoinLinks);
});

it('should normalized queries for quarters range', () => {
  const ddfql = {
    "select": {
      "key": ["geo", "quarter"],
      "value": [
        "sg_population"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"quarter": "$quarter1"},
        {"quarter": "$quarter2"}
      ]
    },
    "join": {
      "$quarter1": {
        "key": "quarter",
        "where": {
          "quarter": {"$gt": "2012q4"}
        }
      },
      "$quarter2": {
        "key": "quarter",
        "where": {
          "quarter": {"$lt": "2015q3"}
        }
      }
    }
  };

  const normalizedDdfql = {
    "select": {
      "key": ["geo", "quarter"],
      "value": [
        "sg_population"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"dimensions": {"$size": 2}},
        {"measure": {"$in": ["sg_population"]}},
        {
          "$and": [
            {"dimensions": "$quarter1"},
            {"dimensions": "$quarter2"}
          ]
        }
      ]
    },
    "join": {
      "$quarter1": {
        "domain": "quarter",
        "parsedProperties.quarter.timeType": "QUARTER_TYPE",
        "parsedProperties.quarter.millis": {"$gt": 1349049600000}
      },
      "$quarter2": {
        "domain": "quarter",
        "parsedProperties.quarter.timeType": "QUARTER_TYPE",
        "parsedProperties.quarter.millis": {"$lt": 1435708800000}
      }
    }
  };

  const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, ['time', 'quarter']);
  expect(actualDdfql, normalizedDdfql);
});

it('should create links in join section for entities filter', () => {
  const ddfql = {
    "select": {
      "key": ["geo", "quarter"],
      "value": [
        "sg_population"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {
          "$or": [
            {"quarter": "2012q4"},
            {"quarter": "2015q3"}
          ]
        },
        {"geo": "dza"}
      ]
    },
    join: {}
  };

  const normalizedDdfql = {
    "select": {
      "key": ["geo", "quarter"],
      "value": [
        "sg_population"
      ]
    },
    "from": "datapoints",
    "where": {
      "$and": [
        {"dimensions": {"$size": 2}},
        {"measure": {"$in": ["sg_population"]}},
        {
          "$and": [
            {
              "$or": [
                {"dimensions": "$parsed_quarter_1"},
                {"dimensions": "$parsed_quarter_2"}
              ]
            },
            {"dimensions": "$parsed_geo_3"}
          ]
        }
      ]
    },
    "join": {
      "$parsed_quarter_1": {
        "domain": "quarter",
        "parsedProperties.quarter.timeType": "QUARTER_TYPE",
        "parsedProperties.quarter.millis": 1349049600000
      },
      "$parsed_quarter_2": {
        "domain": "quarter",
        "parsedProperties.quarter.timeType": "QUARTER_TYPE",
        "parsedProperties.quarter.millis": 1435708800000
      },
      "$parsed_geo_3": {
        "domain": "geo",
        "gid": "dza",
      }
    }
  };

  const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, ['time', 'quarter']);
  expect(actualDdfql).to.deep.equal(normalizedDdfql);
});
