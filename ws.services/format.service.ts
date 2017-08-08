import * as _ from 'lodash';
import * as async from 'async';
import * as hi from 'highland';
import * as fastCsv from 'fast-csv';
import * as wsJsonPack from '../ws.routes/data-post-processors/format/format-ws.processor';
import { constants } from '../ws.utils/constants';

const toFormatter = _.curry(sendResponse);
const csvFormatter = toFormatter(packToCsv);
const wsJsonFormatter = toFormatter(packToWsJson);

export {
  csvFormatter as csv,
  wsJsonFormatter as wsJson,
  wsJsonFormatter as default
};

interface RawDdf {
  datasetName?: string;
  datasetVersionCommit?: string;
  timeConcepts?: any;
  concepts?: any[];
}

function packToCsv(data: any): any {
  const wsJsonStream: any = packToWsJson(data);
  return hi(hi.isStream(wsJsonStream) ? wsJsonStream : [wsJsonStream]).flatMap((wsJson: any) => {
    const rows = _.get(wsJson, 'rows', []);
    const headers = _.get(wsJson, 'headers', []);

    return hi(rows).map((row: any) => _.zipObject(headers, row));
  }).pipe(fastCsv.createWriteStream({ headers: true }));
}

function packToWsJson(data: any): any {
  const rawDdf: RawDdf = _.get(data, 'rawDdf', {});
  rawDdf.datasetName = _.get(data, 'rawDdf.dataset.name', '');
  rawDdf.datasetVersionCommit = _.get(data, 'rawDdf.transaction.commit', '');
  rawDdf.concepts = _.get(rawDdf, 'concepts', []);
  rawDdf.timeConcepts = _.chain(rawDdf.concepts)
    .filter((concept: any) => _.includes(constants.TIME_CONCEPT_TYPES, concept[constants.PROPERTIES][constants.CONCEPT_TYPE]))
    .keyBy(constants.GID)
    .value();
  const ddfDataType = _.get(data, 'type');

  let json = {};

  if (ddfDataType === constants.DATAPOINTS) {
    json = wsJsonPack.mapDatapoints(rawDdf);
  } else if (ddfDataType === constants.ENTITIES) {
    json = wsJsonPack.mapEntities(rawDdf);
  } else if (ddfDataType === constants.CONCEPTS) {
    json = wsJsonPack.mapConcepts(rawDdf);
  } else if (ddfDataType === constants.SCHEMA) {
    json = wsJsonPack.mapSchema(rawDdf);
  }

  return json;
}

function sendResponse(format: Function, data: any, onSendResponse: Function): void {
  return async.setImmediate(() => onSendResponse(null, format(data)));
}
