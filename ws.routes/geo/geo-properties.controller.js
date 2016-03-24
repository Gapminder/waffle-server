'use strict';

var express = require('express');
var compression = require('compression');
var cors = require('cors');

var u = require('../utils');
var controller = require('./geo-properties.service');


/**
 * @swagger
 * definition:
 *  Geo:
 *     type: object
 *     properties:
 *       geo:
 *         type: string
 *         description: Result will consist only from unique geo-props, filtered by geo values.
 *       geo.name:
 *         type: string
 *         description: Result will consist only from name country or region
 *       geo.cat:
 *         type: string
 *         description: May contain some or all of the given values - 'global,region,country,un_state,world_4region,geo'
 *       geo.region:
 *         type: string
 *         description: May contain some or all of the given value - 'asia,americas,europe,africa'
 *       geo.latitude:
 *         type: string
 *         description: Result will consist only from  coordinate (latitude) of the country
 *       geo.longitude:
 *         type: string
 *         description: Result will consist only from coordinate (longitude) of the country
 *
 *  Error:
 *    type: object
 *    properties:
 *      code:
 *        type: integer
 *        format: int32
 *      message:
 *        type: string
 */

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  const cache = require('../../ws.utils/redis-cache')(app.get('config'));
  
  // lists
  /**
   * @swagger
   * /api/geo:
   *   get:
   *    description: Geo-poroperties
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description: array of columns. (by default following columns are used ['geo', 'geo.name', 'geo.cat', 'geo.region'] Order of columns is important)
   *        type: string
   *      - name: where
   *        in: query
   *        description:  list of filters for dimensions
   *        type: string
   *      - name: gapfilling
   *        in: query
   *        description: list of methods for post processing of measures data (isn't supported yet)
   *        type: string
   *    tags:
   *      - Geo
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *            $ref: '#/definitions/Geo'
   *      304:
   *        description: cache
   *        schema:
   *          type: array
   *          items:
   *            $ref: '#/definitions/Geo'
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */

  router.get('/api/geo',
    compression(), u.getCacheConfig('geo'), cors(), cache.route(),
    u.decodeQuery, sendGeoResponse
  );

  router.get('/api/geo/:category',
    compression(), u.getCacheConfig('geo-category'), cache.route(),
    u.decodeQuery, sendGeoResponse
  );

  return app.use(router);
};

function sendGeoResponse(req, res) {
  controller.projectGeoProperties(req.decodedQuery.select, req.decodedQuery.where, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }

    return res.json(result);
  });
}
