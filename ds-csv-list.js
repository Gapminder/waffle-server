module.exports = [
  // Visabi local data
  { uid: 'tmp/basic-indicators.csv',
    filter: {columnNumber: 6, include: ['planet']},
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'planet', columnNumber: 6}],
    indicator:
    { name: 'gdp_per_cap',
      title: 'Gdp per cap' } },
  { uid: '1NOl11kmdo_9lY_w9WohsKvx65az8kPYsXYeprv1w0Tw',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'planet', columnNumber: 6}],
    indicator:
    { name: 'lex',
      title: 'Lex' } },
  { uid: '1NOl11kmdo_9lY_w9WohsKvx65az8kPYsXYeprv1w0Tw',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'planet', columnNumber: 6}],
    indicator:
    { name: 'pop',
      title: 'Pop' } },

  { uid: '1DEdd8HNpByDecPPwIhtKnFbAO0uWCllzcVy6v7U3rJI',
    dimensions: [{type: 'year', columnNumber: 1}, {type: 'region', columnNumber: 6}],
    indicator:
    { name: 'gdp_per_cap',
      title: 'Gdp per cap' } },
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
