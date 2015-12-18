'use strict';

const _ = require('lodash');
const fs = require('fs');

let schemas = _.range(1800, 2016).map(year => {
  return {
    file: `dont-panic-poverty-${year}.csv`,
    headers: ["geo","time","pop", "gdp_pc", "gini", "u5mr"],
    wsProperties: ["geo","time","pop", "gdp_pc", "gini", "u5mr"],
    endpoint: "measureValues",
    query: `time=${year}&real=true&select=geo,time,pop,gdp_pc,gini,u5mr`
  };
});

schemas.push({
  file: `dont-panic-poverty.csv`,
  headers: ["geo","time","pop", "gdp_pc", "gini", "u5mr"],
  wsProperties: ["geo","time","pop", "gdp_pc", "gini", "u5mr"],
  endpoint: "measureValues",
  query: `real=true&select=geo,time,pop,gdp_pc,gini,u5mr`
});

schemas.push({
  file: "dont-panic-poverty-geo-properties.csv",
  headers: ["geo","geo.name","geo.cat","geo.region","geo.lat","geo.lng"],
  wsProperties: ["geo","geo.name","geo.cat","geo.region","geo.lat","geo.lng"],
  endpoint: "geos"
});

module.exports = schemas;



