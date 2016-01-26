'use strict';

const _ = require('lodash');
const fs = require('fs');

let schemas = _.range(1800, 2016).map(year => {
  return {
    file: `dont-panic-poverty-${year}.csv`,
    headers: ["geo","time","population", "gdp_p_cap_const_ppp2011_dollar", "gini", "child_mortality_rate_per1000"],
    wsProperties: ["geo","time","population", "gdp_p_cap_const_ppp2011_dollar", "gini", "child_mortality_rate_per1000"],
    endpoint: "measureValues",
    query: `geo.cat=country&time=${year}&select=geo,time,population,gdp_p_cap_const_ppp2011_dollar,gini,child_mortality_rate_per1000`
  };
});

schemas.push({
  file: `dont-panic-poverty.csv`,
  headers: ["geo","time","population", "gdp_p_cap_const_ppp2011_dollar", "gini", "child_mortality_rate_per1000"],
  wsProperties: ["geo","time","population", "gdp_p_cap_const_ppp2011_dollar", "gini", "child_mortality_rate_per1000"],
  endpoint: "measureValues",
  query: `geo.cat=country&select=geo,time,population,gdp_p_cap_const_ppp2011_dollar,gini,child_mortality_rate_per1000`
});

schemas.push({
  file: "dont-panic-poverty-geo-properties.csv",
  headers: ["geo","geo.name","geo.cat","geo.region","geo.latitude","geo.longitude"],
  wsProperties: ["geo","geo.name","geo.cat","geo.region.country","geo.latitude","geo.longitude"],
  endpoint: "geos",
  query: "select=geo,geo.name,geo.cat,geo.region.country,geo.latitude,geo.longitude"
});

module.exports = schemas;
