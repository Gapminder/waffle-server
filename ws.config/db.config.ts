import * as mongoose from 'mongoose';
import { config } from './config';
import { logger } from './log';

const db = mongoose.connection;
mongoose.set('debug', config.MONGOOSE_DEBUG);
(mongoose as any).Promise = global.Promise;

const dbOptions = {
  server: {
    socketOptions: {
      keepAlive: 1,
      connectTimeoutMS: 300000,
      socketTimeoutMS: 300000
    }
  }
};

if (config.THRASHING_MACHINE) {
  mongoose.connect(config.MONGODB_URL, dbOptions);
} else {
  mongoose.connect(config.MONGODB_URL);
}

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
