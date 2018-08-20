"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = require("bb-tests-provider/dist");
const vizabi_ws_reader_node_1 = require("./ws-reader/vizabi-ws-reader-node");
class WsProdServerTestObject extends dist_1.AbstractTestObject {
    getTitle() {
        return 'WS prod';
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
exports.WsProdServerTestObject = WsProdServerTestObject;
//# sourceMappingURL=ws-prod-server.js.map