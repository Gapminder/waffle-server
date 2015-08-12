'use strict';

/*
* AVOID USING IN DIMENSION SUBTYPE '::'
* bad: {type: 'row', subtype: 'year::month'}
* good: {type: 'row', subtype: 'year/month'}
*/

module.exports = [
  // Visabi local data
  {
    uid: 'tmp/basic-indicators-test.csv',
    filter: {columnNumber: 6, includeValues: ['planet']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'planet', colNumber: 5}],
    indicator: {name: 'gdp_per_cap', title: 'Gdp per cap'}
  },
  {
    uid: 'tmp/basic-indicators-test.csv',
    filter: {columnNumber: 6, includeValues: ['region']},
    dimensions: [{type: 'row', subtype: 'year'}, {type: 'row', subtype: 'region', colNumber: 5}],
    indicator: {name: 'lex', title: 'Lex'}
  },
  { uid: 'tmp/basic-indicators.csv',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'planet', columnNumber: 6}],
    indicator:
    { name: 'pop',
      title: 'Pop' } },

  { uid: '1DEdd8HNpByDecPPwIhtKnFbAO0uWCllzcVy6v7U3rJI',
    filter: {columnNumber: 6, include: ['planet']},
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'region', columnNumber: 6}],
    indicator: { name: 'gdp_per_cap', title: 'Gdp per cap' }
  },
  { uid: '1DEdd8HNpByDecPPwIhtKnFbAO0uWCllzcVy6v7U3rJI',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'region', columnNumber: 6}],
    indicator:
    { name: 'lex',
      title: 'Lex' } },
  { uid: '1DEdd8HNpByDecPPwIhtKnFbAO0uWCllzcVy6v7U3rJI',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'region', columnNumber: 6}],
    indicator:
    { name: 'pop',
      title: 'Pop' } },

  { uid: '1evuPMPqlQr4Qa4jyxeMjHlCSF_tKxzjLg0UgXaKMCDY',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'country', columnNumber: 6}],
    indicator:
    { name: 'gdp_per_cap',
      title: 'Gdp per cap' } },
  { uid: '1evuPMPqlQr4Qa4jyxeMjHlCSF_tKxzjLg0UgXaKMCDY',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'country', columnNumber: 6}],
    indicator:
    { name: 'lex',
      title: 'Lex' } },
  { uid: '1evuPMPqlQr4Qa4jyxeMjHlCSF_tKxzjLg0UgXaKMCDY',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'country', columnNumber: 6}],
    indicator:
    { name: 'pop',
      title: 'Pop' } },

  { uid: '1A-wH2-K64TvIPlKYnxPM4qrEtDYJUu0LZQArn2uQg_E',
    dimensions: [{type: 'year', columnNumber: 5}, {type: 'country', columnNumber: 4},
      {type: 'category', columnNumber: 2}, {type: 'company', columnNumber: 3}],
    indicator:
    { name: 'profit',
      title: 'Profit' } },
  { uid: '1A-wH2-K64TvIPlKYnxPM4qrEtDYJUu0LZQArn2uQg_E',
    dimensions: [{type: 'year', columnNumber: 5}, {type: 'country', columnNumber: 4},
      {type: 'category', columnNumber: 2}, {type: 'company', columnNumber: 3}],
    indicator:
    { name: 'market_share',
      title: 'Market share' } }
];
