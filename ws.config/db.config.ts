import * as mongoose from 'mongoose';
import {config} from './config';

const db = mongoose.connection;
mongoose.set('debug', config.MONGOOSE_DEBUG);
mongoose.connect(config.MONGODB_URL);

(mongoose as any).Promise = global.Promise;

db.on('error', function (err: any): void {
  console.log('db connect error', err);
});

db.once('open', function (): void {
  console.log('db connect good');
});

db.once('close', function (): void {
  console.log('db connect close');
});
