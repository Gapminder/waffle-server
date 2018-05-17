import { AbstractTestObject } from 'bb-tests-provider';
import { WsReader } from './ws-reader/vizabi-ws-reader-node';

export class WsDevServerTestObject extends AbstractTestObject {
  getTitle(): string {
    return 'WS dev';
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
