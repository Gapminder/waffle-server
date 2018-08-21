"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bb_tests_provider_1 = require("bb-tests-provider");
const vizabi_ws_reader_node_1 = require("./ws-reader/vizabi-ws-reader-node");
class WsNewServerTestObject extends bb_tests_provider_1.AbstractTestObject {
    getTitle() {
        return 'NEW WS local';
    }
    getObject() {
        return vizabi_ws_reader_node_1.WsReader.getReader();
    }
    getRootMethod() {
        return 'read';
    }
    getInitMethod() {
        return 'init';
    }
}
exports.WsNewServerTestObject = WsNewServerTestObject;
//# sourceMappingURL=ws-new-server.js.map