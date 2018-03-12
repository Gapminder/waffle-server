import {noop} from 'lodash';
import {config} from '../ws.config/config';
import {logger} from '../ws.config/log';
import * as Lynx from 'lynx';

export class TelegrafService {
  private metrics: any = config.IS_MONITORING_NEEDED ? new Lynx('localhost', 8125) : {set: noop, increment: noop, timing: noop, gauge: noop};
  private tags: object = {};

  public constructor() {
    // pick(config, config.MONITORING__ALLOWED_TAGS);
    const tagsFromEnvs: object = {
      project: '',
      stack: '',
      machineType: '',
      region: ''
    };
    const pid = process.pid;

    this.tags = Object.assign({pid}, tagsFromEnvs);
  }

  // this.metrics.increment('service.job_done');
  // this.metrics.set('service.request_id', 10);
  // this.metrics.timing('service.job_task', 500); // time in ms

  public emit(metric: string, value: number | string): void {
    logger.info({ message: 'Send metric', metric, value });
    this.metrics.set(metric, value);
  }

  public onInstanceStateChanged(value: number = 0): void {
    this.emit(`instance.ready,`, value);
  }
}
