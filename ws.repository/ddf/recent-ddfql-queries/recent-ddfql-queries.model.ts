import {Schema, model} from 'mongoose';

const RecentDdfqlQueriesSchema: any = new Schema({
  queryRaw: {type: Schema.Types.Mixed},
  type: {type: String, enum: ['URLON', 'JSON'], default: 'URLON', required: true},
  createdAt: {type: Date, default: Date.now},
  docsAmount: Number,
  timeSpentInMillis: Number
}, { strict: false, capped: { size: 50000000, max: 512 } } as any);

RecentDdfqlQueriesSchema.index({queryRaw: 1});

export default model('RecentDdfqlQueries', RecentDdfqlQueriesSchema);
