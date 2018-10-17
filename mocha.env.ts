import * as path from 'path';

process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'REDIS_HOST';
process.env.S3_SECRET_KEY = 'S3_SECRET_KEY';
process.env.S3_ACCESS_KEY = 'S3_ACCESS_KEY';
process.env.S3_BUCKET = 'S3_BUCKET';
process.env.INFLUXDB_HOST = 'localhost';
process.env.INFLUXDB_PORT = '8086';
process.env.INFLUXDB_USER = 'testuser';
process.env.INFLUXDB_PASSWORD = 'testpassword';
process.env.INFLUXDB_DATABASE_NAME = 'testdatabase';
process.env.PATH_TO_TRAVIS_KEY = path.join(__dirname, './tslint.json');
