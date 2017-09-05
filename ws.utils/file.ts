import * as _ from 'lodash';
import * as hi from 'highland';
import * as fs from 'fs';
import * as path from 'path';
import * as byline from 'byline';
import * as JSONStream from 'JSONStream';
import { logger } from '../ws.config/log';

import * as csvtojson from 'csvtojson';

export {
  readTextFileByLineAsJsonStream,
  readCsvFileAsStream,
  readCsvFile
};

function readCsvFileAsStream(pathToDdfFolder: string, filepath: string): any {
  const resolvedFilepath = path.resolve(pathToDdfFolder, filepath);

  return hi(fs.createReadStream(resolvedFilepath)
    .pipe(new csvtojson.Converter({ constructResult: false }, { objectMode: true })));
}

function readCsvFile(pathToDdfFolder: string, filepath: string, options: any, cb: Function): void {
  const resolvedFilepath = path.resolve(pathToDdfFolder, filepath);

  const converter = new csvtojson.Converter(Object.assign({}, {
    workerNum: 1,
    flatKeys: true
  }, options));

  converter.fromFile(resolvedFilepath, (err: any, data: any) => {
    if (err) {
      const isCannotFoundError = _.includes(err.toString(), 'cannot be found.');
      if (isCannotFoundError) {
        logger.warn(err);
      } else {
        logger.error(err);
      }
    }

    return cb(null, data);
  });
}

function readTextFileByLineAsJsonStream(pathToFile: string): any {
  const fileWithChangesStream = fs.createReadStream(pathToFile, { encoding: 'utf8' });
  const jsonByLine = byline(fileWithChangesStream).pipe(JSONStream.parse());
  return hi(jsonByLine);
}
