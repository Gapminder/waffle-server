import { model, Schema } from 'mongoose';

const Datasets: any = new Schema({
  name: {type: String, required: true, unique: true, index: true},
  path: {type: String, required: true},
  isLocked: {type: Boolean, 'default': true},
  lockedAt: {type: Date, 'default': Date.now},
  lockedBy: {type: Schema.Types.ObjectId, ref: 'Users'},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': Date.now, required: true},
  accessToken: {type: String, unique: true, sparse: true},
  'private': {type: Boolean, 'default': false}
});

Datasets.index({name: 1});

export default model('Datasets', Datasets);
