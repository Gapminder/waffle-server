import { AbstractTestObject } from 'bb-tests-provider';

const ddfCsvReader = require('./ddfcsv-reader/vizabi-ddfcsv-reader-node');

export class DdfCsvReaderTestObject extends AbstractTestObject {
  getTitle(): string {
    return 'DDF csv reader';
  }

  getObject() {
    return ddfCsvReader.getDDFCsvReaderObject();
  }

  getRootMethod(): string {
    return 'read';
  }

  getInitMethod(): string {
    return 'init';
  }
}
