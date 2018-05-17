import * as path from 'path';

process.env.NODE_ENV = 'test';
process.env.INFLUXDB_HOST = 'localhost';
process.env.INFLUXDB_PORT = '8086';
process.env.INFLUXDB_USER = 'testuser';
process.env.INFLUXDB_PASSWORD = 'testpassword';
process.env.INFLUXDB_DATABASE_NAME = 'testdatabase';
process.env.PATH_TO_TRAVIS_KEY = path.join(__dirname, './tslint.json');
