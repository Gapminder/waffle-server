'use strict';

const sinon = require('sinon');
const chai = require('chai');
const ddfQueryNormalizer = require('./../../ws.ddfql/ddf-datapoints-query-normalizer');

const expect = chai.expect;
const concepts = [
  {gid: 'time', properties: {concept_type: 'time'}},
  {gid: 'quarter', properties: {concept_type: 'time'}},
  {gid: 'geo'},
  {gid: 'country'}
];

describe('ddf datapoints query normalizer - queries simplification', () => {
  it('should normalize where and join clauses for full example', () => {
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
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_1"},
              {$elemMatch: "$parsed_domain_time_1"}
            ]
          }},
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
        },
        "$parsed_domain_geo_1": {
          "domain": "geo",
        },
        "$parsed_domain_time_1": {
          "domain": "time"
        }
      },
      "order_by": [{"geo": "asc"}, {"time": "asc"}]
    };

    const mock = sinon.mock(Math);
    mock.expects("random").twice().returns(1);

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts)).to.deep.equal(normalizedDdfql);

    mock.verify();
    mock.restore();
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
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_4"},
              {$elemMatch: "$parsed_domain_quarter_5"}
            ]
          }},
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
        },
        "$parsed_domain_geo_4": {
          "domain": "geo",
        },
        "$parsed_domain_quarter_5": {
          "domain": "quarter"
        }
      }
    };

    let numParsedLinks = 0;
    sinon.stub(Math, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);

    Math.random.restore();
  });

  it('should normalize query without where and join clauses', () => {
    const ddfql = {
      "from": "datapoints",
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "sg_population"
        ]
      },
      "join": {}
    };

    const normalizedDdfql = {
      "select": {
        "key": ["geo", "time"],
        "value": ["sg_population"]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_1"},
              {$elemMatch: "$parsed_domain_time_2"}
            ]
          }},
          {"measure": {"$in": ["sg_population"]}},
        ]
      },
      "join": {
        "$parsed_domain_geo_1": {
          "domain": "geo",
        },
        "$parsed_domain_time_2": {
          "domain": "time"
        }
      }
    };

    let numParsedLinks = 0;
    sinon.stub(Math, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);

    Math.random.restore();
  });

  it('should parse `{"geo": {"is--country": true}}` in where clause', () => {
    const ddfql = {
      "from": "datapoints",
      "select": {
        "key": ["geo", "time"],
        "value": ["sg_population"]
      },
      "where": {
        "$and": [
          {
            "geo": {"is--country": true}
          }, {
            "time": {"$gte": 1800, "$lte": 2015}
          }
        ]
      },
      join: {}
    };

    const normalizedDdfql = {
      "select": {
        "key": ["geo", "time"],
        "value": ["sg_population"]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_3"},
              {$elemMatch: "$parsed_domain_time_4"}
            ]
          }},
          {"measure": {"$in": ["sg_population"]}},
          {"$and": [
            {"dimensions": "$parsed_geo_1"},
            {"dimensions": "$parsed_time_2"}
          ]}
        ],
      },
      "join": {
        "$parsed_geo_1": {
          "domain": "geo",
          "properties.is--country": true
        },
        "$parsed_time_2": {
          "domain": "time",
          "parsedProperties.time.timeType": "YEAR_TYPE",
          "parsedProperties.time.millis": {"$lte": 1420070400000, "$gte": -5364662400000}
        },
        "$parsed_domain_geo_3": {
          "domain": "geo",
        },
        "$parsed_domain_time_4": {
          "domain": "time"
        }
      }
    };

    let numParsedLinks = 0;
    sinon.stub(Math, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);

    Math.random.restore();
  });

  it('should parse `{"geo.is--country": true}` in where clause', () => {
    const ddfql = {
      "from": "datapoints",
      "select": {
        "key": ["geo", "time"],
        "value": ["sg_population"]
      },
      "where": {
        "$and": [
          {"geo.is--country": true},
          {"time": {"$gte": 1800, "$lte": 2015}}
        ]
      },
      join: {}
    };

    const normalizedDdfql = {
      "select": {
        "key": ["geo", "time"],
        "value": ["sg_population"]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_3"},
              {$elemMatch: "$parsed_domain_time_4"}
            ]
          }},
          {"measure": {"$in": ["sg_population"]}},
          {"$and": [
            {"dimensions": "$parsed_geo_1"},
            {"dimensions": "$parsed_time_2"}
          ]}
        ],
      },
      "join": {
        "$parsed_geo_1": {
          "domain": "geo",
          "properties.is--country": true
        },
        "$parsed_time_2": {
          "domain": "time",
          "parsedProperties.time.timeType": "YEAR_TYPE",
          "parsedProperties.time.millis": {"$lte": 1420070400000, "$gte": -5364662400000}
        },
        "$parsed_domain_geo_3": {
          "domain": "geo",
        },
        "$parsed_domain_time_4": {
          "domain": "time"
        }
      }
    };

    let numParsedLinks = 0;
    sinon.stub(Math, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);

    Math.random.restore();
  });
});

describe('ddf datapoints query normalizer - different time types', () => {
  it('should be parsed QUARTER time type', () => {
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
          {"time": "$time"}
        ]
      },
      "join": {
        "$time": {
          "key": "time",
          "where": {
            "time": {"$lt": "2015q3"}
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
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_1"},
              {$elemMatch: "$parsed_domain_time_1"}
            ]
          }},
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
        },
        "$parsed_domain_geo_1": {
          "domain": "geo",
        },
        "$parsed_domain_time_1": {
          "domain": "time"
        }
      }
    };

    const mock = sinon.mock(Math);
    mock.expects("random").twice().returns(1);

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts)).to.deep.equal(normalizedDdfql);

    mock.verify();
    mock.restore();
  });

  it('should be parsed YEAR time type', () => {
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
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_1"},
              {$elemMatch: "$parsed_domain_time_1"}
            ]
          }},
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
        },
        "$parsed_domain_geo_1": {
          "domain": "geo",
        },
        "$parsed_domain_time_1": {
          "domain": "time"
        }
      }
    };

    const mock = sinon.mock(Math);
    mock.expects("random").twice().returns(1);

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts)).to.deep.equal(normalizedDdfql);

    mock.verify();
    mock.restore();
  });

  it('should be parsed WEEK time type', () => {
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
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_1"},
              {$elemMatch: "$parsed_domain_time_1"}
            ]
          }},
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
        },
        "$parsed_domain_geo_1": {
          "domain": "geo",
        },
        "$parsed_domain_time_1": {
          "domain": "time"
        }
      }
    };

    const mock = sinon.mock(Math);
    mock.expects("random").twice().returns(1);

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts)).to.deep.equal(normalizedDdfql);

    mock.verify();
    mock.restore();
  });

  it('should be parsed DATE time type', () => {
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
          {"time": "$time"}
        ]
      },
      "join": {
        "$time": {
          "key": "time",
          "where": {
            "$and": [
              {"time": {"$lt": "20151201"}},
              {"time": {"$gt": "20130901"}}
            ]
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
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_1"},
              {$elemMatch: "$parsed_domain_time_1"}
            ]
          }},
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
          "$and": [
            {
              "parsedProperties.time.timeType": "DATE_TYPE",
              "parsedProperties.time.millis": {
                "$lt": 1448928000000
              }
            },
            {
              "parsedProperties.time.timeType": "DATE_TYPE",
              "parsedProperties.time.millis": {
                "$gt": 1377993600000
              }
            }
          ],
          "domain": "time"
        },
        "$parsed_domain_geo_1": {
          "domain": "geo",
        },
        "$parsed_domain_time_1": {
          "domain": "time"
        }
      }
    };

    const mock = sinon.mock(Math);
    mock.expects("random").twice().returns(1);

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts)).to.deep.equal(normalizedDdfql);

    mock.verify();
    mock.restore();
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
          {"dimensions": {
            "$size": 2,
            "$all": [
              {$elemMatch: "$parsed_domain_geo_1"},
              {$elemMatch: "$parsed_domain_time_1"}
            ]
          }},
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
        },
        "$parsed_domain_geo_1": {
          "domain": "geo",
        },
        "$parsed_domain_time_1": {
          "domain": "time"
        }
      }
    };

    const mock = sinon.mock(Math);
    mock.expects("random").twice().returns(1);

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, concepts);
    expect(actualDdfql, normalizedDdfql);

    mock.verify();
    mock.restore();
  });
});

describe('ddf datapoints query normalizer - substitute links', () => {
  it('should substitute concept placeholders with ids', () => {
    const conceptsToIds = [
      {gid: "geo", originId: "17a3470d3a8c9b37009b9bf9"},
      {gid: "time", originId: "27a3470d3a8c9b37009b9bf9"},
      {gid: "population", originId: "37a3470d3a8c9b37009b9bf9"},
      {gid: "life_expectancy", originId: "47a3470d3a8c9b37009b9bf9"},
      {gid: "gdp_per_cap", originId: "57a3470d3a8c9b37009b9bf9"},
      {gid: "gov_type", originId: "67a3470d3a8c9b37009b9bf9"},
    ];

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
});
