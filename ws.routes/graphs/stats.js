var regions = {"AFG":"asi","ALB":"eur","DZA":"afr","AGO":"afr","AIA":"ame","ATG":"ame","ARG":"ame","ARM":"eur","AUT":"eur","AZE":"eur","BHS":"ame","BHR":"asi","BGD":"asi","BRB":"ame","BLR":"eur","BEL":"eur","BEN":"afr","BMU":"ame","BTN":"asi","BOL":"ame","BIH":"eur","BWA":"afr","_BV":"asi","BRA":"ame","BGR":"eur","BFA":"afr","BDI":"afr","KHM":"asi","CMR":"afr","CAN":"ame","CPV":"afr","CYM":"ame","TCD":"afr","CHL":"ame","CHN":"asi","COL":"ame","COM":"afr","CRI":"ame","HRV":"eur","CUB":"ame","CYP":"eur","CZE":"eur","DNK":"eur","DJI":"afr","DMA":"ame","DOM":"ame","ECU":"ame","EGY":"afr","SLV":"ame","GNQ":"afr","ERI":"afr","EST":"eur","ETH":"afr","FLK":"ame","FJI":"asi","FIN":"eur","FRA":"eur","GUF":"ame","GAB":"afr","GMB":"afr","GEO":"eur","DEU":"eur","GHA":"afr","GIB":"eur","GRC":"eur","GRD":"ame","GTM":"ame","GBG":"eur","GIN":"afr","GNB":"afr","GUY":"ame","HTI":"ame","HOS":"eur","HND":"ame","HUN":"eur","ISL":"eur","IND":"asi","IDN":"asi","IRQ":"asi","IRL":"eur","GBM":"eur","ISR":"asi","ITA":"eur","JAM":"ame","JPN":"asi","JEY":"eur","JOR":"asi","KAZ":"asi","KGZ":"asi","KEN":"afr","KIR":"asi","KWT":"asi","LVA":"eur","LBN":"asi","LSO":"afr","LBR":"afr","LIE":"eur","LTU":"eur","LUX":"eur","MDG":"afr","MWI":"afr","MYS":"asi","MLI":"afr","MLT":"eur","MHL":"asi","CXR":"asi","MRT":"afr","MUS":"afr","MYT":"afr","MEX":"ame","MCO":"eur","MNG":"asi","MSR":"ame","MAR":"afr","MOZ":"afr","MMR":"asi","NAM":"afr","NPL":"asi","NLD":"eur","NIC":"ame","NER":"afr","NGA":"afr","NOR":"eur","OMN":"asi","PAK":"asi","PLW":"asi","PAN":"ame","PRY":"ame","PER":"ame","PHL":"asi","POL":"eur","PRT":"eur","PRI":"ame","QAT":"asi","REU":"afr","ROU":"eur","RWA":"afr","SHN":"afr","KNA":"ame","LCA":"ame","VCT":"ame","WSM":"asi","SMR":"eur","STP":"afr","SAU":"asi","SEN":"afr","SYC":"afr","SLE":"afr","SGP":"asi","SVK":"eur","SVN":"eur","SLB":"asi","SOM":"afr","_GS":"ame","ESP":"eur","LKA":"asi","SDN":"afr","SUR":"ame","SWZ":"afr","SWE":"eur","CHE":"eur","TJK":"asi","THA":"asi","TLS":"asi","TGO":"afr","TON":"asi","TTO":"ame","TUN":"afr","TUR":"eur","TKM":"asi","TCA":"ame","TUV":"asi","UGA":"afr","UKR":"eur","ARE":"asi","GBR":"eur","USA":"ame","URY":"ame","UZB":"asi","VUT":"asi","VEN":"ame","VNM":"asi","ESH":"afr","YEM":"asi","ZMB":"afr","ZWE":"afr","PNG":"asi","MDA":"eur","PRK":"asi","RUS":"eur","NZL":"asi","GRL":"eur","IRN":"asi","TWN":"asi","KOR":"asi","MNE":"eur","SDS":"afr","LBY":"afr","LAO":"asi","SYR":"asi","FR_TF":"asi","NCL":"asi","BLZ":"ame","BRN":"asi","CIV":"afr","PSE_WEB":"asi","_SOL":"afr","_UNK":"eur","_NCY":"asi","MKD":"eur","COD":"afr","ZAF":"afr","TZA":"afr","AUS":"asi","SRB":"eur","CAF":"afr","PSE":"asi","COG":"afr"};

var _ = require('lodash');
var cache = require('express-redis-cache')();
var cors = require('cors');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var compression = require('compression');

var ensureAuthenticated = require('../utils').ensureAuthenticated;
var getCacheConfig = require('../utils').getCacheConfig;

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var neo4jdb = app.get('neo4jDb');

  var match =
    "MATCH (i1:Indicators)-[:with_dimension]->(:Dimensions{name: 'year'})-[:with_dimension_value]->(dv1:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues), \
      (i1:Indicators)-[:with_dimension]->(:Dimensions{name: 'country'})-[:with_dimension_value]->(dv2:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues)";
  var where = "WHERE i1.name in ['pop', 'u5mr', 'gdp_per_cap', 'gini']";
  var returner = "RETURN collect(i1.name) as indicator,dv1.value as year, dv2.value as country, dv2.title, collect(iv1.value) as value";

  /*eslint new-cap:0*/
  var router = express.Router();

  router.get('/api/graphs/stats/vizabi-tools', getCacheConfig(), cors(), compression(), cache.route({expire: 86400}), vizabiTools);

  return app.use(router);

  function vizabiTools(req, res, next) {
    // some time later
   var select = req.query.select ? _.difference(JSON.parse(req.query.select), ['geo','time']) : ['pop'];
    //var select = ['pop', 'u5mr', 'gdp_per_cap', 'gini'];
    var reqWhere = 'WHERE i1.name in ' + JSON.stringify(select);
    if (req.query.time) {
      var time = parseInt(req.query.time, 10);
      if (time) {
        reqWhere += ' and dv1.value="' + time + '"';
      } else {
        time = JSON.parse(req.query.time);
        reqWhere += [' and dv1.value>="', time.from, '" and dv1.value<="', time.to, '"'].join('');
      }
    }
    var reqQuery = [match, reqWhere, returner].join(' ');
    var headers = ['time', 'geo', 'geo.name', 'geo.cat', 'geo.region'].concat(select);
    console.time('cypher');
    neo4jdb.cypherQuery(reqQuery, function (err, resp) {
      console.timeEnd('cypher');
      console.time('format');
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      var rows = _.map(resp.data, function (row) {
        var resRow = new Array(headers.length);
        // [indicators], year, country, [values]
        resRow[0] = parseInt(row[1], 10); // time
        resRow[1] = (row[2] || '').toLowerCase(); // geo
        resRow[2] = row[3]; // geo.name
        resRow[3] = 'country'; // geo.cat
        resRow[4] = regions[row[2]]; // geo.region
        for (var i = 0; i < row[0].length; i++) {
          resRow[headers.indexOf(row[0][i])] = parseFloat(row[4][i]);
        }
        return resRow;
      });
      console.timeEnd('format');
      return res.json({success: !err, data: {headers: headers, rows: rows}, error: err});
    });
  }
};
