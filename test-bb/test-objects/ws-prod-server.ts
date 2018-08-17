import { AbstractTestObject } from 'bb-tests-provider/dist';
import { WsReader } from './ws-reader/vizabi-ws-reader-node';

export class WsProdServerTestObject extends AbstractTestObject {
  getTitle(): string {
    return 'WS prod';
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
