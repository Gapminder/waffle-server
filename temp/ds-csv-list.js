'use strict';

/*
* AVOID USING IN DIMENSION SUBTYPE '::'
* bad: {type: 'row', subtype: 'year::month'}
* good: {type: 'row', subtype: 'year/month'}
*
* Both colNumber and rowNumber are equal 0 by default
*
* You could use filters for skipping some rows from result (be done before import data would start)
*
* Check if your dimension subtype exists in ws.plugins/csv/plugin-meta.js
* and if it's not, you should add it
*/

module.exports = [
  // Visabi local data
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['planet']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'planet', colNumber: 5}],
    indicator: {name: 'gdp_per_cap', title: 'Gdp per cap'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['region']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'region', colNumber: 5}],
    indicator: {name: 'gdp_per_cap', title: 'Gdp per cap'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['country']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'country', colNumber: 5}],
    indicator: {name: 'gdp_per_cap', title: 'Gdp per cap'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['planet']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'planet', colNumber: 5}],
    indicator: {name: 'lex', title: 'Lex'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['region']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'region', colNumber: 5}],
    indicator: {name: 'lex', title: 'Lex'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['country']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'country', colNumber: 5}],
    indicator: {name: 'lex', title: 'Lex'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['planet']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'planet', colNumber: 5}],
    indicator: {name: 'pop', title: 'Population'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['region']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'region', colNumber: 5}],
    indicator: {name: 'pop', title: 'Population'}
  },
  {
    uid: 'tmp/basic-indicators.csv',
    filter: {colNumber: 6, includeValues: ['country']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'country', colNumber: 5}],
    indicator: {name: 'pop', title: 'Population'}
  },

  {
    uid: 'tmp/companies.csv',
    dimensions: [
      {type: 'row', subtype: 'time', colNumber: 4},
      {type: 'row', subtype: 'country', colNumber: 3},
      {type: 'row', subtype: 'name', colNumber: 2},
      {type: 'row', subtype: 'category', colNumber: 1}
    ],
    indicator: {name: 'profit', title: 'Profit'}
  },
  {
    uid: 'tmp/companies.csv',
    dimensions: [
      {type: 'row', subtype: 'time', colNumber: 4},
      {type: 'row', subtype: 'country', colNumber: 3},
      {type: 'row', subtype: 'name', colNumber: 2},
      {type: 'row', subtype: 'category', colNumber: 1}
    ],
    indicator: {name: 'market_share', title: 'Market share'}
  },

  {
    uid: 'tmp/mountains-pop-gdp-gini.csv',
    dimensions: [{type: 'row', subtype: 'time', colNumber: 4}, {type: 'row', subtype: 'country', colNumber: 1}],
    indicator: {name: 'gini', title: 'Gini'}
  },
  {
    uid: 'tmp/mountains-pop-gdp-gini.csv',
    dimensions: [{type: 'row', subtype: 'time', colNumber: 4}, {type: 'row', subtype: 'country', colNumber: 1}],
    indicator: {name: 'pop', title: 'Population'}
  },
  {
    uid: 'tmp/mountains-pop-gdp-gini.csv',
    dimensions: [{type: 'row', subtype: 'time', colNumber: 4}, {type: 'row', subtype: 'country', colNumber: 1}],
    indicator: {name: 'gdp_per_cap', title: 'Gdp per cap'}
  },

  {
    uid: 'tmp/multi-dimensional.csv',
    dimensions: [
      {type: 'row', subtype: 'time'},
      {type: 'row', subtype: 'country', colNumber: 6},
      {type: 'row', subtype: 'age', colNumber: 2}
    ],
    indicator: {name: 'gdp_per_cap', title: 'Gdp per cap'}
  },
  {
    uid: 'tmp/multi-dimensional.csv',
    dimensions: [
      {type: 'row', subtype: 'time'},
      {type: 'row', subtype: 'country', colNumber: 6},
      {type: 'row', subtype: 'age', colNumber: 2}
    ],
    indicator: {name: 'lex', title: 'Lex'}
  },
  {
    uid: 'tmp/multi-dimensional.csv',
    dimensions: [
      {type: 'row', subtype: 'time'},
      {type: 'row', subtype: 'country', colNumber: 6},
      {type: 'row', subtype: 'age', colNumber: 2}
    ],
    indicator: {name: 'pop', title: 'Population'}
  },

  {
    uid: 'tmp/names.csv',
    dimensions: [{type: 'row', subtype: 'geo.category', colNumber: 2}],
    indicator: {name: 'geo.name', title: 'Countries'}
  },

  {
    uid: 'tmp/population-by-age.csv',
    dimensions: [
      {type: 'row', subtype: 'time', colNumber: 2},
      {type: 'row', subtype: 'country'},
      {type: 'row', subtype: 'age.group', colNumber: 3}
    ],
    indicator: {name: 'pop', title: 'Population by age'}
  },

  {
    uid: 'tmp/swe.csv',
    dimensions: [
      {type: 'row', subtype: 'time', colNumber: 1},
      {type: 'row', subtype: 'short.country'},
      {type: 'row', subtype: 'age', colNumber: 2}
    ],
    indicator: {name: 'population', title: 'Population'}
  },

  {
    uid: 'tmp/usa.csv',
    dimensions: [
      {type: 'row', subtype: 'time', colNumber: 1},
      {type: 'row', subtype: 'short.country'},
      {type: 'row', subtype: 'age', colNumber: 2}
    ],
    indicator: {name: 'population', title: 'Population'}
  }
];
