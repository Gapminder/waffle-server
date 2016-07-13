#!/usr/bin/env node

'use strict';

const shell = require('shelljs');
const utils = require('./utils.runner');

const ACTION = `ACTION=${process.env.ACTION || 'ddf-world2'}`;

const NODE_ENV = utils.config.NODE_ENV;
const LOG_LEVEL = utils.config.LOG_LEVEL;
const LOG_TRANSPORTS = utils.config.LOG_TRANSPORTS;
const MONGODB_URL = utils.config.MONGODB_URL;
const NEO4J_URL = utils.config.NEO4J_URL;
const CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT = utils.config.CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT;
const checkWithWhereIs = true;

const PARAMS = `${ACTION} ${CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT} ${NODE_ENV} ${LOG_LEVEL} ${LOG_TRANSPORTS} ${MONGODB_URL} ${NEO4J_URL}`;

utils.assertCommandExists('mongod');
utils.assertCommandExists('neo4j', checkWithWhereIs);

shell.exec(`${PARAMS} node csv_data_mapping_cli/index.js`);

shell.exit(0);
