"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bb_tests_provider_1 = require("bb-tests-provider");
const ddfCsvReader = require('./ddfcsv-reader/vizabi-ddfcsv-reader-node');
class DdfCsvReaderTestObject extends bb_tests_provider_1.AbstractTestObject {
    getTitle() {
        return 'DDF csv reader';
    }
    getObject() {
        return ddfCsvReader.getDDFCsvReaderObject();
    }
    getRootMethod() {
        return 'read';
    }
    getInitMethod() {
        return 'init';
    }
}
exports.DdfCsvReaderTestObject = DdfCsvReaderTestObject;
//# sourceMappingURL=ddf-csv-reader.js.map