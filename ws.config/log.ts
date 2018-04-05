import * as _ from 'lodash';
import * as path from 'path';
import * as bunyan from 'bunyan';
import { config } from './config';
import * as PrettyStream from 'bunyan-prettystream';
import * as mongoose from 'mongoose';

const logger = bunyan.createLogger({
  name: `WS_${config.LOG_MARKER}`,
  serializers: _.extend({
    obj: objSerializer,
    ddfqlRaw: objSerializer,
    mongo: mongoQuerySerializer
  }, bunyan.stdSerializers),
  streams: getBunyanStreams(config.NODE_ENV)
});

function getBunyanStreams(environment: string): any[] {
  const fileStream = {
    level: config.LOG_LEVEL,
    type: 'rotating-file',
    path: path.join(__dirname, '/../logs/waffle.log'),
    period: 'daily',
    count: 3
  };

  const consoleStream = {
    src: config.NODE_ENV === 'local',
    level: config.LOG_LEVEL,
    stream: (new PrettyStream()).pipe(process.stdout)
  };

  if (environment === 'production') {
    return [fileStream];
  }

  return [fileStream, consoleStream];
}

function objSerializer(obj: any): any {
  return obj;
}

function mongoQuerySerializer(query: any): any {
  if (config.IS_PRODUCTION) {
    return objSerializer(query);
  }

  const objectIdPattern = /("[a-z0-9]{24}")/g;
  return JSON.stringify(query, null, 2).replace(objectIdPattern, (match: string) => {
    const unquotedMatch = match.replace(/"/g, '');
    return mongoose.Types.ObjectId.isValid(unquotedMatch) ? `ObjectId(${match})` : match;
  });
}

export { logger };
