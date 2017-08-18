import { Schema, model } from 'mongoose';
import { OriginIdPlugin } from '../origin-id.plugin';
import { constants } from '../../../ws.utils/constants';

const DataPoints: any = new Schema({
  value: {type: Schema.Types.Mixed, required: true},
  sources: [{type: String, required: true}],

  isNumeric: {type: Boolean, required: true},
  measure: {type: Schema.Types.ObjectId, required: true},
  dimensions: [{type: Schema.Types.ObjectId}],
  dimensionsConcepts: [{type: Schema.Types.ObjectId}],
  properties: {type: Schema.Types.Mixed, default: {}},
  languages: {type: Schema.Types.Mixed, default: {}},

  time: {
    conceptGid: String,
    timeType: String,
    millis: Number
  },

  originId: {type: Schema.Types.ObjectId},
  from: {type: Number, required: true},
  to: {type: Number, required: true, default: constants.MAX_VERSION},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true}
}, { strict: false, minimize: false });

DataPoints.plugin(OriginIdPlugin, {
  modelName: 'DataPoints',
  measure: 'Concepts',
  dimensions: 'Entities',
  originId: 'DataPoints'
});

DataPoints.index({dataset: 1, measure: 1, dimensions: 1, 'time.timeType': 1, from: 1, to: 1, 'time.millis': 1});
DataPoints.index({dataset: 1, measure: 1, dimensions: 1, from: 1, to: 1});
DataPoints.index({dimensionsConcepts: 1, dataset: 1, measure: 1, from: 1, to: 1});
DataPoints.index({dataset: 1, sources: 1, from: 1, to: 1});
DataPoints.index({dataset: 1, from: 1, to: 1});
DataPoints.index({dataset: 1, to: 1});
DataPoints.index({originId: 1});

export default model('DataPoints', DataPoints);
