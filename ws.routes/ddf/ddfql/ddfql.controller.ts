import * as _ from 'lodash';
import * as cors from 'cors';
import * as express from 'express';
import * as compression from 'compression';
import {constants} from '../../../ws.utils/constants';
import * as schemaService from '../../../ws.services/schema.service';
import * as entitiesService from '../../../ws.services/entities.service';
import * as conceptsService from '../../../ws.services/concepts.service';
import * as datapointsService from '../../../ws.services/datapoints.service';
import * as dataPostProcessors from '../../data-post-processors';
import {cache} from '../../../ws.utils/redis-cache';
import {logger} from '../../../ws.config/log';
import * as routeUtils from '../../utils';
import {ServiceLocator} from '../../../ws.service-locator/index';
import {Application} from 'express';

function createDdfqlController(serviceLocator: ServiceLocator): Application {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.use(cors());

  router.get('/api/ddf/ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
    cache.route(),
    compression(),
    routeUtils.bodyFromUrlQuery,
    routeUtils.checkDatasetAccessibility,
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  router.post('/api/ddf/ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
    cache.route(),
    compression(),
    routeUtils.checkDatasetAccessibility,
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  return app.use(router);

  function getDdfStats(req: any, res: any, next: any): void {
    logger.info({req}, 'DDFQL URL');
    logger.info({obj: req.body}, 'DDFQL');

    const query = _.get(req, 'body', {});
    const from = _.get(req, 'body.from', null);

    const onEntriesCollected = routeUtils.respondWithRawDdf(query, req, res, next) as AsyncResultCallback<any, any>;

    if (!from) {
      return onEntriesCollected(`The filed 'from' must present in query.`, null);
    }

    const where = _.get(req, 'body.where', {});
    const language = _.get(req, 'body.language', {});
    const select = _.get(req, 'body.select.value', []);
    const domainGids = _.get(req, 'body.select.key', []);
    const headers = _.union(domainGids, select);
    const sort = _.get(req, 'body.order_by', []);
    const groupBy = _.get(req, 'body.group_by', {});
    const datasetName = _.get(req, 'body.dataset', null);
    const version = _.get(req, 'body.version', null);

    const options = {
      user: req.user,
      from,
      select,
      headers,
      domainGids,
      where,
      sort,
      groupBy,
      datasetName,
      version,
      query,
      language
    };

    req.ddfDataType = from;
    if (from === constants.DATAPOINTS) {
      return datapointsService.collectDatapointsByDdfql(options, onEntriesCollected);
    } else if (from === constants.ENTITIES) {
      return entitiesService.collectEntitiesByDdfql(options, onEntriesCollected);
    } else if (from === constants.CONCEPTS) {
      return conceptsService.collectConceptsByDdfql(options, onEntriesCollected);
    } else if (queryToSchema(from)) {
      req.ddfDataType = constants.SCHEMA;
      const onSchemaEntriesFound = routeUtils.respondWithRawDdf(query, req, res, next) as AsyncResultCallback<any, any> ;
      return schemaService.findSchemaByDdfql(options, onSchemaEntriesFound);
    } else {
      return onEntriesCollected(`Value '${from}' in the 'from' field isn't supported yet.`, null);
    }
  }
}

function queryToSchema(from: any): any {
  return _.endsWith(from, '.schema');
}

export {
  createDdfqlController
};
