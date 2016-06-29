#!/usr/bin/env node

'use strict';

const shell = require('shelljs');
const utils = require('./utils.runner');

const NODE_ENV = utils.config.NODE_ENV;
const LOG_LEVEL = utils.config.LOG_LEVEL;
const LOG_TRANSPORTS = utils.config.LOG_TRANSPORTS;
const SESSION_SECRET = utils.config.SESSION_SECRET;
const MONGODB_URL = utils.config.MONGODB_URL;
const NEO4J_URL = utils.config.NEO4J_URL;

const PARAMS = `${NODE_ENV} ${LOG_LEVEL} ${LOG_TRANSPORTS} ${SESSION_SECRET} ${MONGODB_URL} ${NEO4J_URL}`;

utils.assertCommandExists('forever');
utils.assertCommandExists('redis-cli');

shell.exec('forever stopall');
shell.echo('\nRedis flash all data process:');
shell.exec('redis-cli flushall');
shell.echo('\nRedis flash db process:');
shell.exec('redis-cli flushdb');
shell.exec(`${PARAMS} npm start`);
shell.exec('forever list');

shell.exit(0);

