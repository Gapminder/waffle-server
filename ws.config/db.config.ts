import * as mongoose from 'mongoose';
import { Connection } from 'mongoose';
import { config } from './config';
import { logger } from './log';

const db = mongoose.connection;
mongoose.set('debug', config.MONGOOSE_DEBUG);
(mongoose as any).Promise = global.Promise;

db.on('error', function (err: any): void {
  logger.info('db connect error', err);
});

db.once('open', function (): void {
  logger.info('db connect good');
});

db.once('close', function (): void {
  logger.info('db connect close');
});

const gracefulExit = () => {
  db.close(() => {
    logger.info('Mongoose default connection with DB is disconnected through app termination');
    process.exit(0);
  });
};

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit);

const mongoOptions = {
  keepAlive: true,
  connectTimeoutMS: 300000,
  socketTimeoutMS: 300000
};

const mongooseOptions = { useMongoClient: true };

export function connectToDb(onConnected: (error: any, db?: Connection) => void): void {
  const options: any = config.THRASHING_MACHINE ? Object.assign({}, mongoOptions, mongooseOptions) : mongooseOptions;
  mongoose.connect(config.MONGODB_URL, options, (error: any) => {
    if (error) {
      return onConnected(error);
    }
    return onConnected(null, db);
  });
}
