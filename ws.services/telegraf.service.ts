import {noop, map, pad, reduce, assign, isNumber, Dictionary, clone, keys, pick} from 'lodash';
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

export interface FailedResponse extends Dictionary<number | string> {
  // elapsed_time: number;
  message: string;
  code: number;
  type: string;
  place: string;
}

export interface RequestTags {
  queryParser: {
    query: string;
    queryType: string;
  };
  body?: {
    dataset: string;
    version: string;
    select: {
      key: string[];
      value: string[];
    };
    from: string;
    where: object;
    join: object;
  };
  datasource?: string;
  requestStartTime: number;
}

export interface ResponseTags {
  dataset: string;
  commit: string;
  branch: string;
  from: string;
  select: string;
  datasource: string;
  rows: string;
  requestStartTime: number;
}

const MEASUREMENT_DATASETS: string  = 'datasets';
const MEASUREMENT_RESPONSES: string  = 'responses';

const MEASUREMENT_DATASETS__FIELD_DATAPOINTS: string    = '_datapoints';
const MEASUREMENT_DATASETS__FIELD_CONCEPTS: string      = '_concepts';
const MEASUREMENT_DATASETS__FIELD_ENTITIES: string      = '_entities';
const MEASUREMENT_DATASETS__FIELD_TRANSLATIONS: string  = '_translations';

const MEASUREMENT_RESPONSES__FIELD_ELAPSED_TIME: string  = '_elapsed_time';
const MEASUREMENT_RESPONSES__FIELD_ERROR_MESSAGE: string  = '_error_message';
const MEASUREMENT_RESPONSES__FIELD_ERROR_CODE: string  = '_error_code';
const MEASUREMENT_RESPONSES__FIELD_ERROR_TYPE: string  = '_error_type';
const MEASUREMENT_RESPONSES__FIELD_ERROR_PLACE: string  = '_error_place';

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
  public static STATE_RUN: string = 'start';
  public static STATE_PROCESS: string = 'process';
  public static STATE_FINISH: string = 'finish';

  private static measurementResponsesSchema: ISchemaOptions = {
    measurement: MEASUREMENT_RESPONSES,
    fields: {
      [MEASUREMENT_RESPONSES__FIELD_ELAPSED_TIME]: InfluxFieldType.INTEGER,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_MESSAGE]: InfluxFieldType.STRING,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_CODE]: InfluxFieldType.INTEGER,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_TYPE]: InfluxFieldType.STRING,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_PLACE]: InfluxFieldType.STRING
    },
    tags: keys(defaultTags).concat(['dataset', 'commit', 'branch', 'from', 'where', 'join', 'datasource', 'request_start_time'])
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
      TelegrafService.measurementDatasetsSchema,
      TelegrafService.measurementResponsesSchema
    ]
  };

  private static influxService: InfluxDB = new InfluxDB(TelegrafService.influxdbConfig);

  public static onFailedRespond(response: FailedResponse, tags: RequestTags): void {
    const where = JSON.stringify(tags.body.where);
    const join = JSON.stringify(tags.body.join);
    const context = {
      origin : pick(tags.queryParser, ['query', 'queryType']),
      body: Object.assign({where, join}, pick(tags.body, ['dataset', 'version', 'select', 'from'])),
      requestStartTime: tags.requestStartTime
    };

    const point: IPoint = {
      measurement: MEASUREMENT_RESPONSES,
      tags: Object.assign(context, response, defaultTags),
      fields: {
        [MEASUREMENT_RESPONSES__FIELD_ELAPSED_TIME]: tags.requestStartTime - performance.now(),
        [MEASUREMENT_RESPONSES__FIELD_ERROR_MESSAGE]: response.message,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_CODE]: response.code,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_TYPE]: response.type,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_PLACE]: response.place
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
}
