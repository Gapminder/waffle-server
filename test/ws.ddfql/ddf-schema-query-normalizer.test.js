'use strict';

const chai = require('chai');
const schemaQueryNormalizer = require('./../../ws.ddfql/ddf-schema-query-normalizer');

const expect = chai.expect;

describe('ddf schema query normalizer', () => {
  it('should normalize schema where clause - For the dimensions geo and year, what indicators are available?', () => {
    const schemaDdfql = {
      "select": {
        "key": [
          "key",
          "value"
        ]
      },
      "from": "datapoints.schema",
      "where": {
        "key": [
          "geo",
          "year"
        ]
      }
    };

    const normalizedSchemaDdfql = {
      "select": {
        "key": 1,
        "value": 1
      },
      "aliases": {},
      "from": "datapoints.schema",
      "where": {
        "$and": [
          {"type": "datapoints"},
          {
            "key": [
              "geo",
              "year"
            ]
          }
        ]
      },
      "order_by": []
    };

    expect(schemaQueryNormalizer.normalize(schemaDdfql)[0]).to.deep.equal(normalizedSchemaDdfql);
  });

  it('should normalize schema where clause - In what dimensionality can I get population?', () => {
    const schemaDdfql = {
      "select": {
        "key": [
          "key",
          "value"
        ]
      },
      "from": "datapoints.schema",
      "where": {
        "value": "population"
      }
    };

    const normalizedSchemaDdfql = {
      "select": {
        "key": 1,
        "value": 1
      },
      "aliases": {},
      "from": "datapoints.schema",
      "where": {
        "$and": [
          {"type": "datapoints"},
          {"value": "population"}
        ]
      },
      "order_by": []
    };

    expect(schemaQueryNormalizer.normalize(schemaDdfql)[0]).to.deep.equal(normalizedSchemaDdfql);
  });

  it('should normalize schema where clause - What entity properties are available for geo?', () => {
    const schemaDdfql = {
      "select": {
        "key": [
          "key",
          "value"
        ]
      },
      "from": "entities.schema",
      "where": {
        "key": ["geo"]
      }
    };

    const normalizedSchemaDdfql = {
      "select": {
        "key": 1,
        "value": 1
      },
      "aliases": {},
      "from": "entities.schema",
      "where": {
        "$and": [
          {"type": "entities"},
          {"key": ["geo"]}
        ]
      },
      "order_by": []
    };

    expect(schemaQueryNormalizer.normalize(schemaDdfql)[0]).to.deep.equal(normalizedSchemaDdfql);
  });

  it('should normalize schema where clause - What concept properties are available in the dataset?', () => {
    const schemaDdfql = {
      "select": {
        "key": [
          "key",
          "value"
        ]
      },
      "from": "concepts.schema"
    };

    const normalizedSchemaDdfql = {
      "select": {
        "key": 1,
        "value": 1
      },
      "aliases": {},
      "from": "concepts.schema",
      "where": {
        "$and": [
          {"type": "concepts"},
        ]
      },
      "order_by": []
    };

    expect(schemaQueryNormalizer.normalize(schemaDdfql)[0]).to.deep.equal(normalizedSchemaDdfql);
  });

  it('should normalize schema where clause that contains functions - What datapoints does this dataset have and what are their indicators min and max values?', () => {
    const schemaDdfql = {
      "select": {
        "key": [
          "key",
          "value"
        ],
        "value": [
          "min(value)",
          "max(value)"
        ]
      },
      "from": "datapoints.schema",
    };

    const normalizedSchemaDdfql = {
      "select": {"key": 1, "value": 1, "min(value)": 1, "max(value)": 1},
      "from": "datapoints.schema",
      "aliases": {},
      "where": {
        "$and": [
          {"type": "datapoints"},
        ]
      },
      "order_by": []
    };

    expect(schemaQueryNormalizer.normalize(schemaDdfql)[0]).to.deep.equal(normalizedSchemaDdfql);
  });
});

describe('ddf schema query normalizer -> variables', () => {
  it('should process join: make all filters to be executed on properties and remove concept key', () => {
    const schemaDdfql = {
      "join": {
        "$time": {
          "key": "concept",
          "where": {
            "concept": "anno",
            "concept_type": "time"
          }
        }
      }
    };

    const normalizedSchemaDdfql = {
      "join": {
        "$time": {
          "properties.concept": "anno",
          "properties.concept_type": "time"
        }
      }
    };

    expect(schemaQueryNormalizer.normalizeJoin(schemaDdfql)).to.deep.equal(normalizedSchemaDdfql);
  });

  it('should process where: substitute all join links with values (except key ones)', () => {
    const inputDdfql = {
      "where": {
        "value": "$value",
        "key": {
          "$size": {"$gte": 2},
          "$all": ["geo", "$time"],
        }
      },
      "join": {
        "$value": {
          "where": {
            "properties.concept_type": 'measure'
          }
        },
        "$time": {
          "where": {
            "properties.concept_type": {"$in": ["year", "day"]}
          }
        }
      }
    };

    const expectedDdfql = {
      "where": {
        "value": {"$in": ["population", "gini"]},
        "key": {
          "$size": {"$gte": 2},
          "$all": ["geo", "$time"],
        }
      },
      "join": {
        "$value": {
          "where": {
            "properties.concept_type": 'measure'
          }
        },
        "$time": {
          "where": {
            "properties.concept_type": {"$in": ["year", "day"]}
          }
        }
      },
      "order_by": [],
      "select": {}
    };

    const linksInJoinToValues = {
      "$time": ["year", "day"],
      "$value": ["population", "gini"]
    };

    expect(schemaQueryNormalizer.substituteJoinLinks(inputDdfql, linksInJoinToValues)).to.deep.equal(expectedDdfql);
  });

  it('should process where: substitute variables in where clause with join links', () => {

    const inputDdfql = {
      "select": {
        "key": ["key", "value"],
        "value": ["max($time)"]
      },
      "from": "datapoints.schema",
      "where": {
        "value": "$value",
        "key": {
          "$size": {"$gte": 2},
          "$all": ["geo", "$time"]
        }
      },
      "join": {
        "$value": {
          "key": "concept",
          "where": {
            "concept_type": 'measure'
          }
        },
        "$time": {
          "key": "concept",
          "where": {
            "concept_type": "time"
          }
        }
      }
    };

    const expectedDdfql = {
      "from": "datapoints.schema",
      "join": {
        "$value": {
          "key": "concept",
          "where": {
            "concept_type": 'measure'
          }
        },
        "$time": {
          "key": "concept",
          "where": {
            "concept_type": "time"
          }
        }
      },
      "aliases": {
        "max(time)": "max($time)"
      },
      "order_by": [],
      "select": {
        "key": 1,
        "value": 1,
        "max(time)": 1
      },
      "where": {
        "$and": [
          {
            "type": "datapoints"
          },
          {
            "value": {"$in": ["population", "gini"]},
            "key": {
              "$size": {"$gte": 2},
              "$all": ["geo", "time"]
            }
          }
        ]
      }
    };

    const linksInJoinToValues = {
      "$time": ["time"],
      "$value": ["population", "gini"]
    };

    expect(schemaQueryNormalizer.normalize(inputDdfql, {linksInJoinToValues})[0]).to.deep.equal(expectedDdfql);
  });

  it('should process where: substitute variables in where clause by creating queries for every combination of the variables', () => {
    const inputDdfql = {
      "select": {
        "key": ["key", "value"],
        "value": ["max($time)", "min($time2)", "avg(value)"]
      },
      "from": "datapoints.schema",
      "where": {
        "$and": [
          {
            "key": {
              "$size": {"$gte": 2},
              "$all": ["$time", "$time2"]
            }
          },
          {"value": "$value"},
        ]
      },
      "join": {
        "$value": {
          "key": "concept",
          "where": {
            "concept_type": 'measure'
          }
        },
        "$time": {
          "key": "concept",
          "where": {
            "concept_type": "time"
          }
        },
        "$time2": {
          "key": "concept",
          "where": {
            "concept_type": {"$in": ["year", "day"]}
          }
        }
      }
    };

    const expectedDdfql = [
      {
        "select": {
          "key": 1,
          "value": 1,
          "max(time)": 1,
          "min(year)": 1,
          "avg(value)": 1
        },
        "aliases": {
          "max(time)": "max($time)",
          "min(year)": "min($time2)"
        },
        "from": "datapoints.schema",
        "where": {
          "$and": [
            {"type": "datapoints"},
            {
              "$and": [
                {
                  "key": {
                    "$size": {"$gte": 2},
                    "$all": ["time", "year"]
                  }
                },
                {"value": {"$in": ["population", "gini"]}}
              ]
            }

          ]
        },
        "order_by": [],
        // join will stay unchanged, cause it is processed in normalizeJoin
        "join": {
          "$value": {
            "key": "concept",
            "where": {
              "concept_type": 'measure'
            }
          },
          "$time": {
            "key": "concept",
            "where": {
              "concept_type": "time"
            }
          },
          "$time2": {
            "key": "concept",
            "where": {
              "concept_type": {"$in": ["year", "day"]}
            }
          }
        }
      },
      {
        "select": {
          "key": 1,
          "value": 1,
          "max(time)": 1,
          "min(day)": 1,
          "avg(value)": 1
        },
        "aliases": {
          "max(time)": "max($time)",
          "min(day)": "min($time2)"
        },
        "from": "datapoints.schema",
        "where": {
          "$and": [
            {"type": "datapoints"},
            {
              "$and": [
                {
                  "key": {
                    "$size": {"$gte": 2},
                    "$all": ["time", "day"]
                  }
                },
                {"value": {"$in": ["population", "gini"]}}
              ]
            }
          ]
        },
        "order_by": [],
        "join": {
          "$value": {
            "key": "concept",
            "where": {
              "concept_type": 'measure'
            }
          },
          "$time": {
            "key": "concept",
            "where": {
              "concept_type": "time"
            }
          },
          "$time2": {
            "key": "concept",
            "where": {
              "concept_type": {"$in": ["year", "day"]}
            }
          }
        }
      }
    ];

    const linksInJoinToValues = {
      "$time": ["time"],
      "$time2": ["year", "day"],
      "$value": ["population", "gini"]
    };

    expect(schemaQueryNormalizer.normalize(inputDdfql, {linksInJoinToValues})).to.deep.equal(expectedDdfql);
  });

  it("should properly calculate amount of queries based on given variables: given $time var", () => {

    const inputDdfql = {
      "where": {
        "$and": [
          {
            "key": {
              "$size": {"$gte": 2},
              "$all": ["$time", "$time2"]
            }
          },
          {"value": "$value"},
        ]
      },
      "join": {
        "$value": {
          "key": "concept",
          "where": {
            "concept_type": 'measure'
          }
        },
        "$time": {
          "key": "concept",
          "where": {
            "concept_type": "time"
          }
        },
        "$time2": {
          "key": "concept",
          "where": {
            "concept_type": {"$in": ["year", "day"]}
          }
        }
      }
    };

    const linksInJoinToValues = {
      "$time": ["time"],
      "$value": ["population", "gini"]
    };

    expect(schemaQueryNormalizer.calcNormalizedQueriesAmount(inputDdfql, linksInJoinToValues)).to.equal(1);
  });

  it("should properly calculate amount of queries based on given variables: given $time, $time2 and geo vars", () => {

    const inputDdfql = {
      "where": {
        "$and": [
          {
            "key": {
              "$size": {"$gte": 2},
              "$all": ["$geo", "$time", "$time2"]
            }
          },
          {"value": "$value"},
        ]
      },
      "join": {
        "$value": {
          "key": "concept",
          "where": {
            "concept_type": 'measure'
          }
        },
        "$time": {
          "key": "concept",
          "where": {
            "concept_type": "time"
          }
        },
        "$time2": {
          "key": "concept",
          "where": {
            "concept_type": {"$in": ["year", "day"]}
          }
        }
      }
    };

    const linksInJoinToValues = {
      "$time": ["time"],
      "$time2": ["year", "time"],
      "$geo": ["company", "corporation"],
      "$value": ["population", "gini"]
    };

    expect(schemaQueryNormalizer.calcNormalizedQueriesAmount(inputDdfql, linksInJoinToValues)).to.equal(4);
  });
});
