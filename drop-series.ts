import {
  InfluxDB,
  FieldType as InfluxFieldType,
  IPoint,
  ISchemaOptions,
  ISingleHostConfig,
  IExpressionHead
} from 'influx';
import * as _ from 'lodash';

const config = {
  INFLUXDB_HOST: 'waffle-server-monitoring.gapminderdev.org',
  INFLUXDB_PORT: 8086,
  INFLUXDB_DATABASE_NAME: 'waffle-server-dev',
  INFLUXDB_USER: 'gapminderdev',
  INFLUXDB_PASSWORD: '',
}

const influxdbConfig: ISingleHostConfig = {
  host: config.INFLUXDB_HOST,
  port: +config.INFLUXDB_PORT,
  username: config.INFLUXDB_USER,
  password: config.INFLUXDB_PASSWORD,
  database: config.INFLUXDB_DATABASE_NAME
};
const tagName = 'hostname';

const influxService: InfluxDB = new InfluxDB(influxdbConfig);

function run(dbNames: string[]): void {
  const query = `SELECT hostname FROM (SELECT LAST(_active), hostname FROM instances GROUP BY hostname) WHERE time > now() - 2d ORDER BY time DESC`;

  dbNames.forEach(async function (database: string): Promise<void> {
    try {
      const hosts = await influxService.query(query, {database});
      hosts.forEach((host: string) => dropSeriesByHostname(_.get(host, 'hostname'), database));
    } catch (error) {
      console.error(error);
    }
  });
}


async function dropSeriesByHostname(hostname: string, database: string): Promise<void> {
  const fn = (e: IExpressionHead): IExpressionHead => {
    return e.tag(tagName).equals.value(hostname);
  };

  try {
    console.log(database, hostname);
    //await influxService.dropSeries({where: fn, database});
  } catch (error) {
    console.error(error);
  }
}

run(['waffle-server-prod', 'waffle-server-dev', 'waffle-server-local']);

console.log('Finish');
