import { Schema, model } from 'mongoose';

import {OriginIdPlugin} from '../origin-id.plugin';
import {constants} from '../../../ws.utils/constants';

const Entities = new Schema({
  gid: {type: Schema.Types.Mixed, match: constants.GID_REGEXP, index: true, required: true},
  originId: {type: Schema.Types.ObjectId},

  title: String,
  sources: [{type: String, required: true}],
  properties: {type: Schema.Types.Mixed, default: {}},
  languages: {type: Schema.Types.Mixed, default: {}},

  // should be required
  domain: {type: Schema.Types.ObjectId, required: true},
  sets: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: constants.MAX_VERSION},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
}, { strict: false, minimize: false });

Entities.plugin(OriginIdPlugin, {
  modelName: 'Entities',
  domain: 'Concepts',
  sets: 'Concepts',
  originId: 'Entities'
});

// This index exists only for entities of type "time"
Entities.index({dataset: 1, 'parsedProperties.time.timeType': 1, from: 1, to: 1, 'parsedProperties.time.millis': 1}, {sparse: true});
Entities.index({dataset: 1, from: 1, to: 1, domain: 1, sets: 1});
Entities.index({dataset: 1, originId: 1, from: 1, to: 1});
Entities.index({dataset: 1, gid: 1, 'properties.concept_type': 1, from: 1, to: 1});
Entities.index({dataset: 1, to: 1});
Entities.index({originId: 1});

export default model('Entities', Entities);
