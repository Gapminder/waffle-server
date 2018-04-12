import {noop, map, pad, reduce, assign, isNumber, Dictionary, clone, keys} from 'lodash';
import {config} from '../ws.config/config';
import {logger} from '../ws.config/log';
import {InfluxDB, FieldType as InfluxFieldType, IPoint, ISchemaOptions, ISingleHostConfig} from 'influx';

export interface DatasetState extends Dictionary<string> {
  process: string;
  type: string;
  state: string;
}

export interface DatasetsFileds extends Dictionary<number> {
  datapoints?: number;
  entities?: number;
  concepts?: number;
  translations?: number;
}

const MEASUREMENT_INSTANCES: string = 'instances';
const MEASUREMENT_DATASETS: string  = 'datasets';

const MEASUREMENT_INSTANCES__FIELD_STATUS: string       = '_active';
const MEASUREMENT_INSTANCES__FIELD_LAST_UPDATED: string = '_last_updated';
const MEASUREMENT_DATASETS__FIELD_DATAPOINTS: string    = '_datapoints';
const MEASUREMENT_DATASETS__FIELD_CONCEPTS: string      = '_concepts';
const MEASUREMENT_DATASETS__FIELD_ENTITIES: string      = '_entities';
const MEASUREMENT_DATASETS__FIELD_TRANSLATIONS: string  = '_translations';

// FIXME when new version of typescript will come with supporting getting keys from interfaces
const datasetStateProto: DatasetState = {
  process: '',
  type: '',
  state: ''
};

const defaultTags: Dictionary<string> = {
  created: config.RELEASE_DATE,
  version: config.VERSION,
  suffix: config.MACHINE_SUFFIX,
  project: config.PROJECT,
  hostname: `${config.RELEASE_DATE}--${config.HOSTNAME}`,
  node_env: config.NODE_ENV,
  machine_type: config.MACHINE_TYPE,
  region: config.REGION,
  ws_pid: process.pid.toString()
};

export class TelegrafService {
  public static DEFAULT_QUEUE_INTERVAL: number = 10000;

  public static STATE_RUN: string = 'start';
  public static STATE_PROCESS: string = 'process';
  public static STATE_FINISH: string = 'finish';
  public static STATE_NOT_IMPORTED: string = 'not started';
  public static STATE_IMPORTING: string = 'importing';
  public static STATE_IMPORTED: string = 'imported';

  public static queueTasks: object = {};

  private static measurementInstancesSchema: ISchemaOptions = {
    measurement: MEASUREMENT_INSTANCES,
    fields: {
      [MEASUREMENT_INSTANCES__FIELD_STATUS]: InfluxFieldType.BOOLEAN,
      [MEASUREMENT_INSTANCES__FIELD_LAST_UPDATED]: InfluxFieldType.INTEGER
    },
    tags: keys(defaultTags)
  };

  private static measurementDatasetsSchema: ISchemaOptions = {
    measurement: MEASUREMENT_DATASETS,
    fields: {
      [MEASUREMENT_DATASETS__FIELD_DATAPOINTS]: InfluxFieldType.INTEGER,
      [MEASUREMENT_DATASETS__FIELD_CONCEPTS]: InfluxFieldType.INTEGER,
      [MEASUREMENT_DATASETS__FIELD_ENTITIES]: InfluxFieldType.INTEGER,
      [MEASUREMENT_DATASETS__FIELD_TRANSLATIONS]: InfluxFieldType.INTEGER
    },
    tags: keys(defaultTags).concat(keys(datasetStateProto))
  };

  private static influxdbConfig: ISingleHostConfig = {
    host: config.INFLUXDB_HOST,
    port: +config.INFLUXDB_PORT,
    username: config.INFLUXDB_USER,
    password: config.INFLUXDB_PASSWORD,
    database: config.INFLUXDB_DATABASE_NAME,
    schema: [
      TelegrafService.measurementInstancesSchema,
      TelegrafService.measurementDatasetsSchema
    ]
  };

  private static influxService: InfluxDB = new InfluxDB(TelegrafService.influxdbConfig);

  public static onInstanceRunning(): void {
    const tags = clone(defaultTags);

    const sendMeasurement = this.wrapTask(function(): void {
      const point: IPoint = {
        measurement: MEASUREMENT_INSTANCES,
        tags,
        fields: {
          [MEASUREMENT_INSTANCES__FIELD_STATUS]: true,
          [MEASUREMENT_INSTANCES__FIELD_LAST_UPDATED]: Date.now()
        }
      };

      TelegrafService.influxService
        .writePoints([point])
        .then(() => logger.info({event:'Event: running instance', point}))
        .catch((error: string) => logger.error(error));
    });

    this.addTaskToQueue(MEASUREMENT_INSTANCES__FIELD_STATUS, sendMeasurement);
  }

  public static onDatasetStateChanged(_tags: DatasetState, fields: DatasetsFileds): void {
    const tags = Object.assign({}, _tags, defaultTags);
    const point: IPoint = {
      measurement: MEASUREMENT_DATASETS,
      tags,
      fields: {
        [MEASUREMENT_DATASETS__FIELD_DATAPOINTS]: fields.datapoints,
        [MEASUREMENT_DATASETS__FIELD_CONCEPTS]: fields.concepts,
        [MEASUREMENT_DATASETS__FIELD_ENTITIES]: fields.entities,
        [MEASUREMENT_DATASETS__FIELD_TRANSLATIONS]: fields.translations
      }
    };

    const sendMeasurment = this.wrapTask(function(): void {
      TelegrafService.influxService
        .writePoints([point])
        .then(() => logger.info({event:'Event: dataset state changed', point}))
        .catch((error: string) => logger.error(error));
    });

    sendMeasurment();
  }

  private static wrapTask(task: Function): Function {
    if (config.IS_MONITORING_NEEDED) {
      return task;
    }

    return noop;
  }

  private static addTaskToQueue(taskName: string, task: Function, queueInterval: number = this.DEFAULT_QUEUE_INTERVAL): void {
    this.queueTasks[taskName] = setInterval(task.bind(this), queueInterval);
  }

  private static removeTaskFromQueue(taskName: string): void {
    clearInterval(this.queueTasks[taskName]);
    delete this.queueTasks[taskName];
  }
}
