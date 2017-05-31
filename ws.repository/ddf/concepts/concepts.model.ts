import { Schema, model } from 'mongoose';
import { OriginIdPlugin } from '../origin-id.plugin';

import { constants } from '../../../ws.utils/constants';

const Concepts: any = new Schema({
  gid: {type: String, match: constants.GID_REGEXP, index: true, required: true},
  originId: {type: Schema.Types.ObjectId},

  type: {
    type: String,
    enum: [... constants.DEFAULT_ENTITY_GROUP_TYPES, 'string', 'measure'],
    default: 'string',
    required: true
  },
  sources: [{type: String, required: true}],

  properties: {type: Schema.Types.Mixed, default: {}},
  languages: {type: Schema.Types.Mixed, default: {}},

  isNumeric: {type: Boolean, index: true, sparse: true},
  domain: {type: Schema.Types.ObjectId, sparse: true},
  subsetOf: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: constants.MAX_VERSION},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true}
}, {strict: false, minimize: false});

Concepts.post('save', function (doc: any, next: (error?: any, result?: any) => void): void {
  if (!doc.originId) {
    doc.originId = doc._id;
    model('Concepts').update({ _id: doc._id }, { $set: { originId: doc._id } }, (error: string, result: any) => {
      next(error, result);
    });
  } else {
    next();
  }
});

Concepts.plugin(OriginIdPlugin, {
  modelName: 'Concepts',
  domain: 'Concepts',
  subsetOf: 'Concepts',
  dimensions: 'Concepts',
  originId: 'Concepts'
});

Concepts.index({originId: 1, dataset: 1, from: 1, to: 1});
Concepts.index({gid: 1, dataset: 1, from: 1, to: 1});
Concepts.index({dataset: 1, from: 1, to: 1});
Concepts.index({dataset: 1, to: 1});

export default model('Concepts', Concepts);
