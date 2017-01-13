import { Schema, model }  from 'mongoose';

const KeyValueSchema: any = new Schema({
  key: {type: String, index: true, required: true},
  value: {type: Schema.Types.Mixed}
});

export default model('KeyValue', KeyValueSchema);
