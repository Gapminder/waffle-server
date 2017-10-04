import * as _ from 'lodash';
import * as async from 'async';

import { Application, NextFunction } from 'express';
import { constants } from '../../../ws.utils/constants';
import * as schemaService from '../../../ws.services/schema.service';
import * as entitiesService from '../../../ws.services/entities.service';
import * as conceptsService from '../../../ws.services/concepts.service';
import * as datapointsService from '../../../ws.services/datapoints.service';
import * as dataPostProcessors from '../../data-post-processors';
import { logger } from '../../../ws.config/log';
import * as routeUtils from '../../utils';
import { ServiceLocator } from '../../../ws.service-locator/index';

function createDdfqlController(serviceLocator: ServiceLocator): Application {
  const app = serviceLocator.getApplication();
  (app as any).use(routeUtils.bodyFromUrlQuery);

  (app as any).fastify.get('/api/ddf/ql/*', (request: any, reply: any) => {
    request.body = request.query = request.req.body;

    async.series([
      (next: any) => {
        getDdfStats(request, Object.assign({status: (value: any) => next(value)}, reply), next);
      },
      (next: any) => {
        dataPostProcessors.gapfilling(request, reply, next);
      },
      (next: any) => {
        dataPostProcessors.toPrecision(request, reply, next);
      },
      (next: any) => {
        dataPostProcessors.pack(request, Object.assign({send: (value: any) => next(value), json: (value: any) => next(value), setHeader: (value: any) => value}, reply));
      }
    ], (result: any) => {
      reply.send(result);
    });
  });

  return (app as any);

  function getDdfStats(req: any, res: any, next: NextFunction): void {
    logger.info({req}, 'DDFQL URL');
    logger.info({obj: req.body}, 'DDFQL');

    const queryStartTime: number = Date.now();
    const query = _.get(req, 'body', {});
    const from = _.get(req, 'body.from', null);

    const onEntriesCollected = routeUtils.respondWithRawDdf(_.extend({queryStartTime}, query), req, res, next) as AsyncResultCallback<any, any>;

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
      const onSchemaEntriesFound = routeUtils.respondWithRawDdf(_.extend({queryStartTime}, query), req, res, next) as AsyncResultCallback<any, any> ;
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
