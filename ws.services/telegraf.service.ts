import {noop, map, pad, reduce, assign, isNumber, Dictionary, clone, keys, pick, get} from 'lodash';
import {config} from '../ws.config/config';
import {logger} from '../ws.config/log';
import {InfluxDB, FieldType as InfluxFieldType, IPoint, ISchemaOptions, ISingleHostConfig} from 'influx';

const {
  performance
} = require('perf_hooks');

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
  url: string;
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

const MEASUREMENT_DATASETS: string = 'datasets';
const MEASUREMENT_RESPONSES: string = 'responses';

const MEASUREMENT_DATASETS__FIELD_DATAPOINTS: string = '_datapoints';
const MEASUREMENT_DATASETS__FIELD_CONCEPTS: string = '_concepts';
const MEASUREMENT_DATASETS__FIELD_ENTITIES: string = '_entities';
const MEASUREMENT_DATASETS__FIELD_TRANSLATIONS: string = '_translations';

const MEASUREMENT_RESPONSES__FIELD_ELAPSED_TIME: string = '_elapsed_time';
const MEASUREMENT_RESPONSES__FIELD_ERROR_MESSAGE: string = '_error_message';
const MEASUREMENT_RESPONSES__FIELD_ERROR_CODE: string = '_error_code';
const MEASUREMENT_RESPONSES__FIELD_ERROR_TYPE: string = '_error_type';
const MEASUREMENT_RESPONSES__FIELD_ERROR_PLACE: string = '_error_place';
const MEASUREMENT_RESPONSES__FIELD_ERROR_DATASET: string = '_error_dataset';
const MEASUREMENT_RESPONSES__FIELD_ERROR_COMMIT: string = '_error_commit';
const MEASUREMENT_RESPONSES__FIELD_ERROR_BRANCH: string = '_error_branch';
const MEASUREMENT_RESPONSES__FIELD_ERROR_URL: string = '_error_url';

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
      [MEASUREMENT_RESPONSES__FIELD_ERROR_PLACE]: InfluxFieldType.STRING,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_DATASET]: InfluxFieldType.STRING,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_COMMIT]: InfluxFieldType.STRING,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_BRANCH]: InfluxFieldType.STRING,
      [MEASUREMENT_RESPONSES__FIELD_ERROR_URL]: InfluxFieldType.STRING
    },
    tags: keys(defaultTags).concat([
      'dataset', 'commit', 'branch', 'selectKey', 'selectValue', 'from',
      'where', 'join', 'datasource', 'requestStartTime', 'query', 'queryType',
      'body', 'place', 'code', 'type', 'message', 'url'
    ])
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
    const url = get(tags, 'originalUrl', null);
    const dataset = get(tags, 'body.dataset', null);
    const commit = get(tags, 'body.version', null);
    const branch = get(tags, 'body.branch', null);
    const selectKey = get(tags, 'body.select.key', null);
    const selectValue = get(tags, 'body.select.value', null);
    const from = get(tags, 'body.from', null);
    const where = JSON.stringify(get(tags, 'body.where', {}));
    const join = JSON.stringify(get(tags, 'body.join', {}));
    const query = get(tags, 'queryParser.query', null);
    const queryType = get(tags, 'queryParser.queryType', null);
    const context = {
      query,
      queryType,
      where,
      join,
      dataset,
      branch,
      commit,
      selectKey,
      selectValue,
      from,
      url,
      requestStartTime: tags.requestStartTime
    };

    const point: IPoint = {
      measurement: MEASUREMENT_RESPONSES,
      tags: Object.assign(context, response, defaultTags),
      fields: {
        [MEASUREMENT_RESPONSES__FIELD_ELAPSED_TIME]: performance.now() - tags.requestStartTime,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_MESSAGE]: response.message,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_CODE]: response.code,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_TYPE]: response.type,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_PLACE]: response.place,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_DATASET]: dataset,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_COMMIT]: commit,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_BRANCH]: branch,
        [MEASUREMENT_RESPONSES__FIELD_ERROR_URL]: url
      }
    };

    const sendMeasurment = this.wrapTask(function (): void {
      TelegrafService.influxService
        .writePoints([point])
        .then(() => logger.info({event: 'Event: dataset state changed', point}))
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

    const sendMeasurment = this.wrapTask(function (): void {
      TelegrafService.influxService
        .writePoints([point])
        .then(() => logger.info({event: 'Event: dataset state changed', point}))
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
