import * as _ from 'lodash';
import * as async from 'async';

import * as wsJsonPack from '../ws.routes/data-post-processors/format/format-ws.processor';
import * as constants from '../ws.utils/constants';

function packToWsJson(data, format, onSendResponse) {
  const datasetName = _.get(data, 'rawDdf.dataset.name');
  const datasetVersionCommit = _.get(data, 'rawDdf.transaction.commit');
  const rawDdf = _.extend({
    datasetName,
    datasetVersionCommit
  }, _.get(data, 'rawDdf', {}));

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

  return async.setImmediate(() => onSendResponse(null, json));
}

export {
  packToWsJson as wsJson,
  packToWsJson as default
};
