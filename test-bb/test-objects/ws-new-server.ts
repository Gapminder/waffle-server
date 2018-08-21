import { AbstractTestObject } from 'bb-tests-provider';
import { WsReader } from './ws-reader/vizabi-ws-reader-node';

export class WsNewServerTestObject extends AbstractTestObject {
  getTitle(): string {
    return 'NEW WS local';
  }

  getObject() {
    return WsReader.getReader();
  }

  getRootMethod(): string {
    return 'read';
  }

  getInitMethod(): string {
    return 'init';
  }
}
