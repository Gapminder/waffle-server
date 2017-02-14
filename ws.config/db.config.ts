import * as mongoose from 'mongoose';
import {config} from './config';

const db = mongoose.connection;
mongoose.set('debug', config.MONGOOSE_DEBUG);
mongoose.connect(config.MONGODB_URL);

(<any>mongoose).Promise = global.Promise;

db.on('error', function (err) {
  console.log('db connect error', err);
});

db.once('open', function () {
  console.log('db connect good');
});

db.once('close', function () {
  console.log('db connect close');
});
