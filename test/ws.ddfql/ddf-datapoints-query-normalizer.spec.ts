import 'mocha';

import * as _ from 'lodash';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';

const test = sinonTest.configureTest(sinon);

import * as conceptUtils from '../../ws.import/utils/concepts.utils';
import * as ddfQueryUtils from '../../ws.ddfql/ddf-query-utils';
import * as ddfQueryNormalizer from '../../ws.ddfql/ddf-datapoints-query-normalizer';

const concepts = Object.freeze([
  {gid: 'time', originId: "27a3470d3a8c9b37009b9bf9", properties: {concept_type: 'time'}},
  {gid: 'quarter', originId: "77a3471d3a8c9b37009b9bf0", properties: {concept_type: 'quarter'}},
  {gid: 'geo', originId: "17a3470d3a8c9b37009b9bf9", properties: {concept_type: 'entity_domain'}},
  {gid: 'country', properties: {concept_type: 'entity_set'}},
  {gid: 'latitude', properties: {concept_type: 'measure'}},
  {gid: "population", originId: "37a3470d3a8c9b37009b9bf9", properties: {concept_type: 'measure'}},
  {gid: "life_expectancy", originId: "47a3470d3a8c9b37009b9bf9", properties: {concept_type: 'measure'}},
  {gid: "gdp_per_cap", originId: "57a3470d3a8c9b37009b9bf9", properties: {concept_type: 'measure'}},
  {gid: "gov_type", originId: "67a3470d3a8c9b37009b9bf9", properties: {concept_type: 'measure'}},
  {gid: 'company', originId: '17a3470d3a8c9b37429b9bf9', properties: {concept_type: 'entity_domain'}},
  {gid: 'project', originId: '27a3470d3a8c9b37429b9bf9', properties: {concept_type: 'entity_domain'}},
  {gid: 'lines_of_code', originId: '37a3470d3a8c9b37429b9bf9', properties: {concept_type: 'measure'}}
]);
const options = Object.freeze({
  concepts,
  conceptOriginIdsByGids: ddfQueryUtils.getConceptOriginIdsByGids(concepts),
  conceptGids: ddfQueryUtils.getConceptGids(concepts),
  domainGids: ddfQueryUtils.getDomainGids(concepts),
  timeConceptsGids: conceptUtils.getTimeConceptGids(concepts),
  conceptsByGids: ddfQueryUtils.getConceptsByGids(concepts),
  conceptsByOriginIds: ddfQueryUtils.getConceptsByOriginIds(concepts),
});

describe('ddf datapoints query normalizer - queries simplification', () => {
  it('should normalize where and join clauses for full example', test(function() {
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
      "from": "datapoints",
      "join": {
        "$geo": {
          "$and": [
            {
              "properties.is--country": true
            },
            {
              "properties.latitude": {
                "$lte": 0
              }
            }
          ],
          "$or": [
            {
              "domain": "17a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "17a3470d3a8c9b37009b9bf9"
            }
          ]
        },
        "$time": {
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ],
          "parsedProperties.time.millis": {
            "$lt": 1420070400000
          },
          "parsedProperties.time.timeType": "YEAR_TYPE"
        },
        "$time2": {
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ],
          "parsedProperties.time.millis": {
            "$eq": -1640995200000
          },
          "parsedProperties.time.timeType": "YEAR_TYPE"
        }
      },
      "order_by": [
        {
          "geo": "asc"
        },
        {
          "time": "asc"
        }
      ],
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "population",
          "life_expectancy",
          "gdp_per_cap",
          "gov_type"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "population",
                "life_expectancy",
                "gdp_per_cap",
                "gov_type"
              ]
            }
          },
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
                    "dimensions": "$time2",
                    "measure": "population",
                    "value": {
                      "$gt": 100000
                    }
                  },
                  {
                    "measure": "life_expectancy",
                    "value": {
                      "$gt": 30,
                      "$lt": 70
                    }
                  },
                  {
                    "measure": "gdp_per_cap",
                    "value": {
                      "$gt": 600,
                      "$lt": 500
                    }
                  },
                  {
                    "measure": "gdp_per_cap",
                    "value": {
                      "$gt": 1000
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  }));

  it('should create links in join section for entities filter', test(function() {
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
      "join": {}
    };

    const normalizedDdfql = {
      "from": "datapoints",
      "join": {
        "$parsed_geo_3": {
          "$or": [
            {
              "domain": "17a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "17a3470d3a8c9b37009b9bf9"
            }
          ],
          "gid": "dza"
        },
        "$parsed_quarter_1": {
          "$or": [
            {
              "domain": "77a3471d3a8c9b37009b9bf0"
            },
            {
              "sets": "77a3471d3a8c9b37009b9bf0"
            }
          ],
          "parsedProperties.quarter.millis": 1349049600000,
          "parsedProperties.quarter.timeType": "QUARTER_TYPE"
        },
        "$parsed_quarter_2": {
          "$or": [
            {
              "domain": "77a3471d3a8c9b37009b9bf0"
            },
            {
              "sets": "77a3471d3a8c9b37009b9bf0"
            }
          ],
          "parsedProperties.quarter.millis": 1435708800000,
          "parsedProperties.quarter.timeType": "QUARTER_TYPE"
        }
      },
      "select": {
        "key": [
          "geo",
          "quarter"
        ],
        "value": [
          "sg_population"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "77a3471d3a8c9b37009b9bf0"]} },
          {
            "measure": {
              "$in": [
                "sg_population"
              ]
            }
          },
          {
            "$and": [
              {
                "$or": [
                  {
                    "dimensions": "$parsed_quarter_1"
                  },
                  {
                    "dimensions": "$parsed_quarter_2"
                  }
                ]
              },
              {
                "dimensions": "$parsed_geo_3"
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    this.stub(_, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  }));

  it('should normalize query without where and join clauses', test(function() {
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
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {"measure": {"$in": ["sg_population"]}},
        ]
      },
      "join": {
      }
    };

    let numParsedLinks = 0;
    this.stub(_, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  }));

  it('should parse `{"join": "where": {"is--country": true}}` in where clause', test(function() {
    const ddfql = {
      "from": "datapoints",
      "select": {
        "key": ["geo", "time"],
        "value": ["sg_population"]
      },
      "where": {
        "$and": [
          { "geo": "$geo" },
          { "time": {"$gte": 1800, "$lte": 2015} }
        ]
      },
      "join": {
        "$geo": {
          "key": "geo",
          "where": {
            "is--country": true
          }
        }
      }
    };

    const normalizedDdfql = {
      "from": "datapoints",
      "join": {
        "$geo": {
          "$or": [
            {
              "domain": "17a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "17a3470d3a8c9b37009b9bf9"
            }
          ],
          "properties.is--country": true
        },
        "$parsed_time_1": {
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ],
          "parsedProperties.time.millis": {
            "$gte": -5364662400000,
            "$lte": 1420070400000
          },
          "parsedProperties.time.timeType": "YEAR_TYPE"
        }
      },
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "sg_population"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "sg_population"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$geo"
              },
              {
                "dimensions": "$parsed_time_1"
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    this.stub(_, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  }));

  it('should parse `{"join": "where": {"geo.is--country": true}}` in where clause', test(function() {
    const ddfql = {
      "from": "datapoints",
      "select": {
        "key": ["geo", "time"],
        "value": ["sg_population"]
      },
      "where": {
        "$and": [
          {"geo": "$geo"},
          {"time": {"$gte": 1800, "$lte": 2015}}
        ]
      },
      "join": {
        "$geo": {
          "key": "geo",
          "where": {
            "geo.is--country": true
          }
        }
      }
    };

    const normalizedDdfql = {
      "from": "datapoints",
      "join": {
        "$geo": {
          "$or": [
            {
              "domain": "17a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "17a3470d3a8c9b37009b9bf9"
            }
          ],
          "properties.is--country": true
        },
        "$parsed_time_1": {
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ],
          "parsedProperties.time.millis": {
            "$gte": -5364662400000,
            "$lte": 1420070400000
          },
          "parsedProperties.time.timeType": "YEAR_TYPE"
        }
      },
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "sg_population"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "sg_population"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$geo"
              },
              {
                "dimensions": "$parsed_time_1"
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    this.stub(_, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  }));

  it('should parse and normalize query with geo and time domains', test(function() {
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
      "where": {
        "$and":[
          {"geo": {"$in": ["dza", "usa", "ukr"]}}
        ]
      },
      "join": {}
    };

    const normalizedDdfql = {
      "from": "datapoints",
      "join": {
        "$parsed_geo_1": {
          "$or": [
            {
              "domain": "17a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "17a3470d3a8c9b37009b9bf9"
            }
          ],
          "gid": {
            "$in": [
              "dza",
              "usa",
              "ukr"
            ]
          }
        }
      },
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "sg_population"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "sg_population"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$parsed_geo_1"
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    this.stub(_, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  }));

  it('should parse and normalize query with project and company domains', test(function() {
    const ddfql = {
      "select": {
        "key": ["company", "project"],
        "value": ["lines_of_code"]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"project": {"$ne": "xbox", "$nin": ["office"], "$in": ["vizabi","ws","mic"]}}
        ]
      },
      "join": {}
    };

    const normalizedDdfql = {
      "from": "datapoints",
      "join": {
        "$parsed_project_1": {
          "$or": [
            {
              "domain": "27a3470d3a8c9b37429b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37429b9bf9"
            }
          ],
          "gid": {
            "$in": [
              "vizabi",
              "ws",
              "mic"
            ],
            "$ne": "xbox",
            "$nin": [
              "office"
            ]
          }
        }
      },
      "select": {
        "key": [
          "company",
          "project"
        ],
        "value": [
          "lines_of_code"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37429b9bf9", "27a3470d3a8c9b37429b9bf9"]} },
          {
            "measure": {
              "$in": [
                "lines_of_code"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$parsed_project_1"
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    this.stub(_, "random", () => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  }));
});

describe('ddf datapoints query normalizer - different time types', () => {
  it('should be parsed QUARTER time type', test(function() {
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
      "from": "datapoints",
      "join": {
        "$time": {
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ],
          "parsedProperties.time.millis": {
            "$lt": 1435708800000
          },
          "parsedProperties.time.timeType": "QUARTER_TYPE"
        }
      },
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "population",
          "life_expectancy",
          "gdp_per_cap",
          "gov_type"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "population",
                "life_expectancy",
                "gdp_per_cap",
                "gov_type"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$time"
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  }));

  it('should be parsed YEAR time type', test(function() {
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
            "time": {"$lt": "2015"}
          }
        },
      }
    };

    const normalizedDdfql = {
      "from": "datapoints",
      "join": {
        "$time": {
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ],
          "parsedProperties.time.millis": {
            "$lt": 1420070400000
          },
          "parsedProperties.time.timeType": "YEAR_TYPE"
        }
      },
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "population",
          "life_expectancy",
          "gdp_per_cap",
          "gov_type"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "population",
                "life_expectancy",
                "gdp_per_cap",
                "gov_type"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$time"
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  }));

  it('should be parsed WEEK time type', test(function() {
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
      "from": "datapoints",
      "join": {
        "$time": {
          "$and": [
            {
              "parsedProperties.time.millis": {
                "$lt": 1422230400000
              },
              "parsedProperties.time.timeType": "WEEK_TYPE"
            },
            {
              "parsedProperties.time.millis": {
                "$gt": 1420416000000
              },
              "parsedProperties.time.timeType": "WEEK_TYPE"
            }
          ],
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ]
        }
      },
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "population",
          "life_expectancy",
          "gdp_per_cap",
          "gov_type"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "population",
                "life_expectancy",
                "gdp_per_cap",
                "gov_type"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$time"
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  }));

  it('should be parsed DATE time type', test(function() {
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
      "from": "datapoints",
      "join": {
        "$time": {
          "$and": [
            {
              "parsedProperties.time.millis": {
                "$lt": 1448928000000
              },
              "parsedProperties.time.timeType": "DATE_TYPE"
            },
            {
              "parsedProperties.time.millis": {
                "$gt": 1377993600000
              },
              "parsedProperties.time.timeType": "DATE_TYPE"
            }
          ],
          "$or": [
            {
              "domain": "27a3470d3a8c9b37009b9bf9"
            },
            {
              "sets": "27a3470d3a8c9b37009b9bf9"
            }
          ]
        }
      },
      "select": {
        "key": [
          "geo",
          "time"
        ],
        "value": [
          "population",
          "life_expectancy",
          "gdp_per_cap",
          "gov_type"
        ]
      },
      "where": {
        "$and": [
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
          {
            "measure": {
              "$in": [
                "population",
                "life_expectancy",
                "gdp_per_cap",
                "gov_type"
              ]
            }
          },
          {
            "$and": [
              {
                "dimensions": "$time"
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  }));

  it('should normalized queries for quarters range', test(function() {
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
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "77a3471d3a8c9b37009b9bf0"]} },
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
          "$or": [
            {"domain": "77a3471d3a8c9b37009b9bf0"},
            {"sets": "77a3471d3a8c9b37009b9bf0"}
          ],
          "parsedProperties.quarter.timeType": "QUARTER_TYPE",
          "parsedProperties.quarter.millis": {"$gt": 1349049600000}
        },
        "$quarter2": {
          "$or": [
            {"domain": "77a3471d3a8c9b37009b9bf0"},
            {"sets": "77a3471d3a8c9b37009b9bf0"}
          ],
          "parsedProperties.quarter.timeType": "QUARTER_TYPE",
          "parsedProperties.quarter.millis": {"$lt": 1435708800000}
        }
      }
    };

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.be.deep.equal(normalizedDdfql);
  }));
});

describe('ddf datapoints query normalizer - substitute links', () => {
  it('should substitute concept placeholders with ids', test(function() {
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
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
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
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
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

    expect(ddfQueryNormalizer.substituteDatapointConceptsWithIds(normalizedDdfql, options)).to.deep.equal(normalizedDdfqlWithSubstitutedConcepts);
  }));

  it('should substitute join link in where clause', test(function() {
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
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
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
            {"gid": {"$in": ["dza", "usa", "ukr"]}},
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
          { "dimensions": {"$size": 2} },
          { "dimensionsConcepts": {$all: ["17a3470d3a8c9b37009b9bf9", "27a3470d3a8c9b37009b9bf9"]} },
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
            {"gid": {"$in": ["dza", "usa", "ukr"]}},
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
  }));
});
