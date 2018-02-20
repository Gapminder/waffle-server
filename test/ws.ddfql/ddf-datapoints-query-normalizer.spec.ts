import 'mocha';

import * as _ from 'lodash';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as conceptUtils from '../../ws.import/utils/concepts.utils';
import * as ddfQueryUtils from '../../ws.ddfql/ddf-query-utils';
import * as ddfQueryNormalizer from '../../ws.ddfql/ddf-datapoints-query-normalizer';

const sandbox = sinon.createSandbox();

const concepts = Object.freeze([
  { gid: 'time', originId: '27a3470d3a8c9b37009b9bf9', properties: { concept_type: 'time' } },
  { gid: 'quarter', originId: '77a3471d3a8c9b37009b9bf0', properties: { concept_type: 'quarter' } },
  { gid: 'geo', originId: '17a3470d3a8c9b37009b9bf9', properties: { concept_type: 'entity_domain' } },
  {
    gid: 'country',
    originId: '17a3470d3a8c9b37009b9bf9-country',
    properties: { concept_type: 'entity_set' },
    domain: '17a3470d3a8c9b37009b9bf9',
    type: 'entity_set'
  },
  { gid: 'latitude', properties: { concept_type: 'measure' } },
  { gid: 'population', originId: '37a3470d3a8c9b37009b9bf9', properties: { concept_type: 'measure' } },
  { gid: 'life_expectancy', originId: '47a3470d3a8c9b37009b9bf9', properties: { concept_type: 'measure' } },
  { gid: 'gdp_per_cap', originId: '57a3470d3a8c9b37009b9bf9', properties: { concept_type: 'measure' } },
  { gid: 'gov_type', originId: '67a3470d3a8c9b37009b9bf9', properties: { concept_type: 'measure' } },
  { gid: 'company', originId: '17a3470d3a8c9b37429b9bf9', properties: { concept_type: 'entity_domain' } },
  { gid: 'project', originId: '27a3470d3a8c9b37429b9bf9', properties: { concept_type: 'entity_domain' } },
  { gid: 'lines_of_code', originId: '37a3470d3a8c9b37429b9bf9', properties: { concept_type: 'measure' } }
]);

const options = Object.freeze({
  concepts,
  conceptOriginIdsByGids: ddfQueryUtils.getConceptOriginIdsByGids(concepts),
  conceptGids: ddfQueryUtils.getConceptGids(concepts),
  domainGids: ddfQueryUtils.getDomainGids(concepts),
  domainGidsFromQuery: [],
  timeConceptsGids: conceptUtils.getTimeConceptGids(concepts),
  conceptsByGids: ddfQueryUtils.getConceptsByGids(concepts),
  conceptsByOriginIds: ddfQueryUtils.getConceptsByOriginIds(concepts)
});

describe('ddf datapoints query normalizer - queries simplification', () => {

  afterEach(() => sandbox.restore());

  it('should normalize where and join clauses for full example', () => {
    const selectKey = ['geo', 'time'];
    options.domainGidsFromQuery.push(...ddfQueryUtils.getDomainGidsFromQuery(selectKey, options.conceptsByGids, options.conceptsByOriginIds));

    const ddfql = {
      select: {
        key: selectKey,
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { geo: '$geo' },
          { time: '$time' },
          {
            $or: [
              { population: { $gt: 100000 }, time: '$time2' },
              { life_expectancy: { $gt: 30, $lt: 70 } },
              { gdp_per_cap: { $gt: 600, $lt: 500 } },
              { gdp_per_cap: { $gt: 1000 } }
            ]
          }
        ]
      },
      join: {
        $geo: {
          key: 'geo',
          where: {
            $and: [
              { 'geo.is--country': true },
              { latitude: { $lte: 0 } }
            ]
          }
        },
        $time: {
          key: 'time',
          where: {
            time: { $lt: 2015 }
          }
        },
        $time2: {
          key: 'time',
          where: {
            time: { $eq: 1918 }
          }
        }
      },
      order_by: ['geo', { time: 'asc' }]
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $geo: {
          $and: [
            {
              'properties.is--country': true
            },
            {
              'properties.latitude': {
                $lte: 0
              }
            }
          ],
          domain: '17a3470d3a8c9b37009b9bf9'
        },
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.millis': {
            $lt: 1420070400000
          },
          'parsedProperties.time.timeType': 'YEAR_TYPE'
        },
        $time2: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.millis': {
            $eq: -1640995200000
          },
          'parsedProperties.time.timeType': 'YEAR_TYPE'
        }
      },
      order_by: [
        {
          geo: 'asc'
        },
        {
          time: 'asc'
        }
      ],
      select: {
        key: [
          'geo',
          'time'
        ],
        value: [
          'population',
          'life_expectancy',
          'gdp_per_cap',
          'gov_type'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'population',
                'life_expectancy',
                'gdp_per_cap',
                'gov_type'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$geo'
              },
              {
                dimensions: '$time'
              },
              {
                $or: [
                  {
                    dimensions: '$time2',
                    measure: 'population',
                    value: {
                      $gt: 100000
                    }
                  },
                  {
                    measure: 'life_expectancy',
                    value: {
                      $gt: 30,
                      $lt: 70
                    }
                  },
                  {
                    measure: 'gdp_per_cap',
                    value: {
                      $gt: 600,
                      $lt: 500
                    }
                  },
                  {
                    measure: 'gdp_per_cap',
                    value: {
                      $gt: 1000
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
  });

  it('should normalize where and join clauses for entity_set example', () => {
    const selectKey = ['country', 'time'];
    options.domainGidsFromQuery.push(...ddfQueryUtils.getDomainGidsFromQuery(selectKey, options.conceptsByGids, options.conceptsByOriginIds));

    const ddfql = {
      select: {
        key: selectKey,
        value: [
          'population'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { time: '$time' },
          { population: { $gt: 100000 } }
        ]
      },
      join: {
        $time: {
          key: 'time',
          where: {
            time: { $lt: 2015 }
          }
        }
      },
      order_by: ['country', { time: 'asc' }]
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $parsed_geo_1: {
          domain: '17a3470d3a8c9b37009b9bf9',
          'properties.is--country': true
        },
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.millis': {
            $lt: 1420070400000
          },
          'parsedProperties.time.timeType': 'YEAR_TYPE'
        }
      },
      order_by: [
        {
          country: 'asc'
        },
        {
          time: 'asc'
        }
      ],
      select: {
        key: [
          'country',
          'time'
        ],
        value: [
          'population'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'population'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$time'
              },
              {
                measure: 'population',
                value: {
                  $gt: 100000
                }
              },
              {
                dimensions: '$parsed_geo_1'
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    sandbox.stub(_, 'random').callsFake(() => {
      return ++numParsedLinks;
    });

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  });

  it('should create links in join section for entities filter', () => {
    const ddfql = {
      select: {
        key: ['geo', 'quarter'],
        value: [
          'sg_population'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          {
            $or: [
              { quarter: '2012q4' },
              { quarter: '2015q3' }
            ]
          },
          { geo: 'dza' }
        ]
      },
      join: {}
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $parsed_geo_3: {
          domain: '17a3470d3a8c9b37009b9bf9',
          gid: 'dza'
        },
        $parsed_quarter_1: {
          domain: '77a3471d3a8c9b37009b9bf0',
          'parsedProperties.quarter.millis': 1349049600000,
          'parsedProperties.quarter.timeType': 'QUARTER_TYPE'
        },
        $parsed_quarter_2: {
          domain: '77a3471d3a8c9b37009b9bf0',
          'parsedProperties.quarter.millis': 1435708800000,
          'parsedProperties.quarter.timeType': 'QUARTER_TYPE'
        }
      },
      select: {
        key: [
          'geo',
          'quarter'
        ],
        value: [
          'sg_population'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '77a3471d3a8c9b37009b9bf0'] } },
          {
            measure: {
              $in: [
                'sg_population'
              ]
            }
          },
          {
            $and: [
              {
                $or: [
                  {
                    dimensions: '$parsed_quarter_1'
                  },
                  {
                    dimensions: '$parsed_quarter_2'
                  }
                ]
              },
              {
                dimensions: '$parsed_geo_3'
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    sandbox.stub(_, 'random').callsFake(() => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  });

  it('should normalize query without where and join clauses', () => {
    const ddfql = {
      from: 'datapoints',
      select: {
        key: [
          'geo',
          'time'
        ],
        value: [
          'sg_population'
        ]
      },
      join: {}
    };

    const normalizedDdfql = {
      select: {
        key: ['geo', 'time'],
        value: ['sg_population']
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          { measure: { $in: ['sg_population'] } }
        ]
      },
      join: {}
    };

    let numParsedLinks = 0;
    sandbox.stub(_, 'random').callsFake(() => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  });

  it('should parse `{"join": "where": {"is--country": true}}` in where clause', () => {
    const ddfql = {
      from: 'datapoints',
      select: {
        key: ['geo', 'time'],
        value: ['sg_population']
      },
      where: {
        $and: [
          { geo: '$geo' },
          { time: { $gte: 1800, $lte: 2015 } }
        ]
      },
      join: {
        $geo: {
          key: 'geo',
          where: {
            'is--country': true
          }
        }
      }
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $geo: {
          domain: '17a3470d3a8c9b37009b9bf9',
          'properties.is--country': true
        },
        $parsed_time_1: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.millis': {
            $gte: -5364662400000,
            $lte: 1420070400000
          },
          'parsedProperties.time.timeType': 'YEAR_TYPE'
        }
      },
      select: {
        key: [
          'geo',
          'time'
        ],
        value: [
          'sg_population'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'sg_population'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$geo'
              },
              {
                dimensions: '$parsed_time_1'
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    sandbox.stub(_, 'random').callsFake(() => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  });

  it('should parse `{"join": "where": {"country.is--country": true}}` in where clause', () => {
    const selectKey = ['country', 'time'];
    options.domainGidsFromQuery.push(...ddfQueryUtils.getDomainGidsFromQuery(selectKey, options.conceptsByGids, options.conceptsByOriginIds));

    const ddfql = {
      from: 'datapoints',
      select: {
        key: selectKey,
        value: ['sg_population']
      },
      where: {
        $and: [
          { country: '$country' },
          { time: { $gte: 1800, $lte: 2015 } }
        ]
      },
      join: {
        $country: {
          key: 'country',
          where: {
            'is--country': true
          }
        }
      }
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $country: {
          sets: '17a3470d3a8c9b37009b9bf9-country',
          'properties.is--country': true
        },
        $parsed_geo_2: {
          domain: '17a3470d3a8c9b37009b9bf9',
          'properties.is--country': true
        },
        $parsed_time_1: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.millis': {
            $gte: -5364662400000,
            $lte: 1420070400000
          },
          'parsedProperties.time.timeType': 'YEAR_TYPE'
        }
      },
      select: {
        key: [
          'country',
          'time'
        ],
        value: [
          'sg_population'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'sg_population'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$country'
              },
              {
                dimensions: '$parsed_time_1'
              },
              {
                dimensions: '$parsed_geo_2'
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    sandbox.stub(_, 'random').callsFake(() => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  });

  it('should parse and normalize query with country and time domains', () => {
    const selectKey = ['country', 'time'];
    options.domainGidsFromQuery.push(...ddfQueryUtils.getDomainGidsFromQuery(selectKey, options.conceptsByGids, options.conceptsByOriginIds));

    const ddfql = {
      from: 'datapoints',
      select: {
        key: selectKey,
        value: [
          'sg_population'
        ]
      },
      where: {
        $and: [
          { country: { $in: ['dza', 'usa', 'ukr'] } }
        ]
      },
      join: {}
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $parsed_geo_2: {
          domain: '17a3470d3a8c9b37009b9bf9',
          'properties.is--country': true
        },
        $parsed_country_1: {
          sets: '17a3470d3a8c9b37009b9bf9-country',
          gid: {
            $in: [
              'dza',
              'usa',
              'ukr'
            ]
          }
        }
      },
      select: {
        key: [
          'country',
          'time'
        ],
        value: [
          'sg_population'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'sg_population'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$parsed_country_1'
              },
              {
                dimensions: '$parsed_geo_2'
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    sandbox.stub(_, 'random').callsFake(() => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  });

  it('should parse and normalize query with project and company domains', () => {
    const selectKey = ['company', 'project'];
    options.domainGidsFromQuery.push(...ddfQueryUtils.getDomainGidsFromQuery(selectKey, options.conceptsByGids, options.conceptsByOriginIds));

    const ddfql = {
      select: {
        key: selectKey,
        value: ['lines_of_code']
      },
      from: 'datapoints',
      where: {
        $and: [
          { project: { $ne: 'xbox', $nin: ['office'], $in: ['vizabi', 'ws', 'mic'] } }
        ]
      },
      join: {}
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $parsed_project_1: {
          domain: '27a3470d3a8c9b37429b9bf9',
          gid: {
            $in: [
              'vizabi',
              'ws',
              'mic'
            ],
            $ne: 'xbox',
            $nin: [
              'office'
            ]
          }
        }
      },
      select: {
        key: [
          'company',
          'project'
        ],
        value: [
          'lines_of_code'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37429b9bf9', '27a3470d3a8c9b37429b9bf9'] } },
          {
            measure: {
              $in: [
                'lines_of_code'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$parsed_project_1'
              }
            ]
          }
        ]
      }
    };

    let numParsedLinks = 0;
    sandbox.stub(_, 'random').callsFake(() => {
      return ++numParsedLinks;
    });

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.deep.equal(normalizedDdfql);
  });
});

describe('ddf datapoints query normalizer - different time types', () => {

  afterEach(() => sandbox.restore());

  it('should be parsed QUARTER time type', () => {
    const ddfql = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { time: '$time' }
        ]
      },
      join: {
        $time: {
          key: 'time',
          where: {
            time: { $lt: '2015q3' }
          }
        }
      }
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.millis': {
            $lt: 1435708800000
          },
          'parsedProperties.time.timeType': 'QUARTER_TYPE'
        }
      },
      select: {
        key: [
          'geo',
          'time'
        ],
        value: [
          'population',
          'life_expectancy',
          'gdp_per_cap',
          'gov_type'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'population',
                'life_expectancy',
                'gdp_per_cap',
                'gov_type'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$time'
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  });

  it('should be parsed YEAR time type', () => {
    const ddfql = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { time: '$time' }
        ]
      },
      join: {
        $time: {
          key: 'time',
          where: {
            time: { $lt: '2015' }
          }
        }
      }
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.millis': {
            $lt: 1420070400000
          },
          'parsedProperties.time.timeType': 'YEAR_TYPE'
        }
      },
      select: {
        key: [
          'geo',
          'time'
        ],
        value: [
          'population',
          'life_expectancy',
          'gdp_per_cap',
          'gov_type'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'population',
                'life_expectancy',
                'gdp_per_cap',
                'gov_type'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$time'
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  });

  it('should be parsed WEEK time type', () => {
    const ddfql = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { time: '$time' }
        ]
      },
      join: {
        $time: {
          key: 'time',
          where: {
            $and: [{ time: { $lt: '2015w5' } }, { time: { $gt: '2015w2' } }]
          }
        }
      }
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $time: {
          $and: [
            {
              'parsedProperties.time.millis': {
                $lt: 1422230400000
              },
              'parsedProperties.time.timeType': 'WEEK_TYPE'
            },
            {
              'parsedProperties.time.millis': {
                $gt: 1420416000000
              },
              'parsedProperties.time.timeType': 'WEEK_TYPE'
            }
          ],
          domain: '27a3470d3a8c9b37009b9bf9'
        }
      },
      select: {
        key: [
          'geo',
          'time'
        ],
        value: [
          'population',
          'life_expectancy',
          'gdp_per_cap',
          'gov_type'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'population',
                'life_expectancy',
                'gdp_per_cap',
                'gov_type'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$time'
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  });

  it('should be parsed DATE time type', () => {
    const ddfql = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { time: '$time' }
        ]
      },
      join: {
        $time: {
          key: 'time',
          where: {
            $and: [
              { time: { $lt: '20151201' } },
              { time: { $gt: '20130901' } }
            ]
          }
        }
      }
    };

    const normalizedDdfql = {
      from: 'datapoints',
      join: {
        $time: {
          $and: [
            {
              'parsedProperties.time.millis': {
                $lt: 1448928000000
              },
              'parsedProperties.time.timeType': 'DATE_TYPE'
            },
            {
              'parsedProperties.time.millis': {
                $gt: 1377993600000
              },
              'parsedProperties.time.timeType': 'DATE_TYPE'
            }
          ],
          domain: '27a3470d3a8c9b37009b9bf9'
        }
      },
      select: {
        key: [
          'geo',
          'time'
        ],
        value: [
          'population',
          'life_expectancy',
          'gdp_per_cap',
          'gov_type'
        ]
      },
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            measure: {
              $in: [
                'population',
                'life_expectancy',
                'gdp_per_cap',
                'gov_type'
              ]
            }
          },
          {
            $and: [
              {
                dimensions: '$time'
              }
            ]
          }
        ]
      }
    };

    expect(ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options)).to.deep.equal(normalizedDdfql);
  });

  it('should normalized queries for quarters range', () => {
    const ddfql = {
      select: {
        key: ['geo', 'quarter'],
        value: [
          'sg_population'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { quarter: '$quarter1' },
          { quarter: '$quarter2' }
        ]
      },
      join: {
        $quarter1: {
          key: 'quarter',
          where: {
            quarter: { $gt: '2012q4' }
          }
        },
        $quarter2: {
          key: 'quarter',
          where: {
            quarter: { $lt: '2015q3' }
          }
        }
      }
    };

    const normalizedDdfql = {
      select: {
        key: ['geo', 'quarter'],
        value: [
          'sg_population'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '77a3471d3a8c9b37009b9bf0'] } },
          { measure: { $in: ['sg_population'] } },
          {
            $and: [
              { dimensions: '$quarter1' },
              { dimensions: '$quarter2' }
            ]
          }
        ]
      },
      join: {
        $quarter1: {
          domain: '77a3471d3a8c9b37009b9bf0',
          'parsedProperties.quarter.timeType': 'QUARTER_TYPE',
          'parsedProperties.quarter.millis': { $gt: 1349049600000 }
        },
        $quarter2: {
          domain: '77a3471d3a8c9b37009b9bf0',
          'parsedProperties.quarter.timeType': 'QUARTER_TYPE',
          'parsedProperties.quarter.millis': { $lt: 1435708800000 }
        }
      }
    };

    const actualDdfql = ddfQueryNormalizer.normalizeDatapointDdfQuery(ddfql, options);
    expect(actualDdfql).to.be.deep.equal(normalizedDdfql);
  });
});

describe('ddf datapoints query normalizer - substitute links', () => {

  afterEach(() => sandbox.restore());

  it('should substitute concept placeholders with ids', () => {
    const normalizedDdfql = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            $and: [
              { dimensions: '$geo' },
              { dimensions: '$time' },
              {
                $or: [
                  {
                    measure: 'population',
                    value: { $gt: 100000 },
                    dimensions: '$time2'
                  },
                  {
                    measure: 'life_expectancy',
                    value: { $gt: 30, $lt: 70 }
                  },
                  {
                    measure: 'gdp_per_cap',
                    value: { $gt: 600, $lt: 500 }
                  },
                  {
                    measure: 'gdp_per_cap',
                    value: { $gt: 1000 }
                  }
                ]
              }
            ]
          }
        ]
      },
      join: {
        $geo: {
          domain: 'geo',
          $and: [
            { 'properties.is--country': true },
            { 'properties.latitude': { $lte: 0 } }
          ]
        },
        $time: {
          domain: 'time',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $lt: 1377993600000 }
        },
        $time2: {
          domain: 'time',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $eq: 1377993600000 }
        }
      }
    };

    const normalizedDdfqlWithSubstitutedConcepts = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            $and: [
              { dimensions: '$geo' },
              { dimensions: '$time' },
              {
                $or: [
                  {
                    measure: '37a3470d3a8c9b37009b9bf9',
                    value: { $gt: 100000 },
                    dimensions: '$time2'
                  },
                  {
                    measure: '47a3470d3a8c9b37009b9bf9',
                    value: { $gt: 30, $lt: 70 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 600, $lt: 500 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 1000 }
                  }
                ]
              }
            ]
          }
        ]
      },
      join: {
        $geo: {
          domain: '17a3470d3a8c9b37009b9bf9',
          $and: [
            { 'properties.is--country': true },
            { 'properties.latitude': { $lte: 0 } }
          ]
        },
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $lt: 1377993600000 }
        },
        $time2: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $eq: 1377993600000 }
        }
      }
    };

    expect(ddfQueryNormalizer.substituteDatapointConceptsWithIds(normalizedDdfql, options)).to.deep.equal(normalizedDdfqlWithSubstitutedConcepts);
  });

  it('should substitute join link in where clause', () => {
    const linksInJoinToValues = {
      $geo: [
        '27a3470d3a8c9b37009b9bf9',
        '27a3470d3a8c9b37009b9bf9',
        '27a3470d3a8c9b37009b9bf9'
      ],
      $time: [
        '47a3470d3a8c9b37009b9bf9',
        '47a3470d3a8c9b37009b9bf9',
        '47a3470d3a8c9b37009b9bf9'
      ],
      $time2: [
        '67a3470d3a8c9b37009b9bf9',
        '67a3470d3a8c9b37009b9bf9',
        '67a3470d3a8c9b37009b9bf9'
      ]
    };

    const normalizedDdfql = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            $and: [
              {
                dimensions: '$geo'
              },
              {
                dimensions: '$time'
              },
              {
                $or: [
                  {
                    measure: '37a3470d3a8c9b37009b9bf9',
                    value: { $gt: 100000 },
                    dimensions: '$time2'
                  },
                  {
                    measure: '47a3470d3a8c9b37009b9bf9',
                    value: { $gt: 30, $lt: 70 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 600, $lt: 500 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 1000 }
                  }
                ]
              }
            ]
          }
        ]
      },
      join: {
        $geo: {
          domain: '17a3470d3a8c9b37009b9bf9',
          $and: [
            { gid: { $in: ['dza', 'usa', 'ukr'] } },
            { 'properties.is--country': true },
            { 'properties.latitude': { $lte: 0 } }
          ]
        },
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $lt: 1377993600000 }
        },
        $time2: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $eq: 1377993600000 }
        }
      }
    };

    const normalizedDdfqlWithSubstitutedJoinLinks = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            $and: [
              {
                dimensions: {
                  $in: [
                    '27a3470d3a8c9b37009b9bf9',
                    '27a3470d3a8c9b37009b9bf9',
                    '27a3470d3a8c9b37009b9bf9'
                  ]
                }
              },
              {
                dimensions: {
                  $in: [
                    '47a3470d3a8c9b37009b9bf9',
                    '47a3470d3a8c9b37009b9bf9',
                    '47a3470d3a8c9b37009b9bf9'
                  ]
                }
              },
              {
                $or: [
                  {
                    measure: '37a3470d3a8c9b37009b9bf9',
                    value: { $gt: 100000 },
                    dimensions: {
                      $in: [
                        '67a3470d3a8c9b37009b9bf9',
                        '67a3470d3a8c9b37009b9bf9',
                        '67a3470d3a8c9b37009b9bf9'
                      ]
                    }
                  },
                  {
                    measure: '47a3470d3a8c9b37009b9bf9',
                    value: { $gt: 30, $lt: 70 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 600, $lt: 500 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 1000 }
                  }
                ]
              }
            ]
          }
        ]
      },
      join: {
        $geo: {
          domain: '17a3470d3a8c9b37009b9bf9',
          $and: [
            { gid: { $in: ['dza', 'usa', 'ukr'] } },
            { 'properties.is--country': true },
            { 'properties.latitude': { $lte: 0 } }
          ]
        },
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $lt: 1377993600000 }
        },
        $time2: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $eq: 1377993600000 }
        }
      },
      order_by: []
    };

    expect(ddfQueryNormalizer.substituteDatapointJoinLinks(normalizedDdfql, linksInJoinToValues)).to.deep.equal(normalizedDdfqlWithSubstitutedJoinLinks);
  });

  it('should substitute join link in where clause and remove parents for empty entities list', () => {
    const linksInJoinToValues = {
      $geo: [],
      $time: [
        '47a3470d3a8c9b37009b9bf9',
        '47a3470d3a8c9b37009b9bf9',
        '47a3470d3a8c9b37009b9bf9'
      ],
      $time2: [
        '67a3470d3a8c9b37009b9bf9',
        '67a3470d3a8c9b37009b9bf9',
        '67a3470d3a8c9b37009b9bf9'
      ]
    };

    const normalizedDdfql = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            $and: [
              {
                dimensions: '$geo'
              },
              {
                dimensions: '$time'
              },
              {
                $or: [
                  {
                    measure: '37a3470d3a8c9b37009b9bf9',
                    value: { $gt: 100000 },
                    dimensions: '$time2'
                  },
                  {
                    measure: '47a3470d3a8c9b37009b9bf9',
                    value: { $gt: 30, $lt: 70 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 600, $lt: 500 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 1000 }
                  }
                ]
              }
            ]
          }
        ]
      },
      join: {
        $geo: {
          domain: '17a3470d3a8c9b37009b9bf9',
          $and: [
            { gid: { $in: ['dza', 'usa', 'ukr'] } },
            { 'properties.is--country': true },
            { 'properties.latitude': { $lte: 0 } }
          ]
        },
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $lt: 1377993600000 }
        },
        $time2: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $eq: 1377993600000 }
        }
      }
    };

    const normalizedDdfqlWithSubstitutedJoinLinks = {
      select: {
        key: ['geo', 'time'],
        value: [
          'population', 'life_expectancy', 'gdp_per_cap', 'gov_type'
        ]
      },
      from: 'datapoints',
      where: {
        $and: [
          { dimensions: { $size: 2 } },
          { dimensionsConcepts: { $all: ['17a3470d3a8c9b37009b9bf9', '27a3470d3a8c9b37009b9bf9'] } },
          {
            $and: [
              {
                dimensionsConcepts: {
                  $nin: [
                    '17a3470d3a8c9b37009b9bf9'
                  ]
                }
              },
              {
                dimensions: {
                  $in: [
                    '47a3470d3a8c9b37009b9bf9',
                    '47a3470d3a8c9b37009b9bf9',
                    '47a3470d3a8c9b37009b9bf9'
                  ]
                }
              },
              {
                $or: [
                  {
                    measure: '37a3470d3a8c9b37009b9bf9',
                    value: { $gt: 100000 },
                    dimensions: {
                      $in: [
                        '67a3470d3a8c9b37009b9bf9',
                        '67a3470d3a8c9b37009b9bf9',
                        '67a3470d3a8c9b37009b9bf9'
                      ]
                    }
                  },
                  {
                    measure: '47a3470d3a8c9b37009b9bf9',
                    value: { $gt: 30, $lt: 70 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 600, $lt: 500 }
                  },
                  {
                    measure: '57a3470d3a8c9b37009b9bf9',
                    value: { $gt: 1000 }
                  }
                ]
              }
            ]
          }
        ]
      },
      join: {
        $geo: {
          domain: '17a3470d3a8c9b37009b9bf9',
          $and: [
            { gid: { $in: ['dza', 'usa', 'ukr'] } },
            { 'properties.is--country': true },
            { 'properties.latitude': { $lte: 0 } }
          ]
        },
        $time: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $lt: 1377993600000 }
        },
        $time2: {
          domain: '27a3470d3a8c9b37009b9bf9',
          'parsedProperties.time.timeType': 'YEAR_TYPE',
          'parsedProperties.time.millis': { $eq: 1377993600000 }
        }
      },
      order_by: []
    };

    expect(ddfQueryNormalizer.substituteDatapointJoinLinks(normalizedDdfql, linksInJoinToValues)).to.deep.equal(normalizedDdfqlWithSubstitutedJoinLinks);
  });
});
