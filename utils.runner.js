'use strict';

const shell = require('shelljs');

// import
const CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT = `CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT=${process.env.CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT || 'false'}`;

// run, import, export
const NODE_ENV = process.env.NODE_ENV ? `NODE_ENV=${process.env.NODE_ENV}`: '';
const LOG_LEVEL = process.env.LOG_LEVEL ? `LOG_LEVEL=${process.env.LOG_LEVEL}` : '';
const LOG_TRANSPORTS = process.env.LOG_TRANSPORTS ? `LOG_TRANSPORTS=${process.env.LOG_TRANSPORTS}` : '';

const SESSION_SECRET = process.env.SESSION_SECRET ? `SESSION_SECRET=${process.env.SESSION_SECRET}`: '';
const MONGODB_URL = `MONGODB_URL=${process.env.MONGODB_URL || 'mongodb://@localhost:27017/ws_test'}`;
const NEO4J_URL = `NEO4J_URL=${process.env.NEO4J_URL || 'http://neo4j:neo4j@localhost:7474'}`;

// swagger-ui
const SWAGGER_UI_TAG = process.env.SWAGGER_UI_TAG || 'v2.1.4';
const WS_HOST = process.env.WS_HOST || 'http://localhost:3000/api-docs.json';
const SWAGGER_UI_LINK_DEFAULT = "http://petstore.swagger.io/v2/swagger.json";
const SWAGGER_UI_INDEX_PATH = process.env.SWAGGER_UI_INDEX_PATH || 'dist/index.html';
const DEFAULT_COMMAND_FOR_OPEN_BROWSER = process.env.DEFAULT_COMMAND_FOR_OPEN_BROWSER;

module.exports = {
  assertCommandExists: assertCommandExists,
  assertCommandCode: assertCommandCode,
  config: {
    NODE_ENV, LOG_LEVEL, LOG_TRANSPORTS, SESSION_SECRET, MONGODB_URL, NEO4J_URL,

    SWAGGER_UI_TAG, WS_HOST, SWAGGER_UI_LINK_DEFAULT, SWAGGER_UI_INDEX_PATH,
    DEFAULT_COMMAND_FOR_OPEN_BROWSER,

    CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT
  }
};

function assertCommandExists(command, checkWithWhereIs) {
  let result = checkWithWhereIs && whereIs(command);

  if (result) {
    shell.echo(`The command was found in folder(s): ${result.join(', ')}`);
    return;
  }

  if (!shell.which(command)) {
    shell.echo(`Sorry, this script requires '${command}' as a global installed module`);
    return shell.exit(1);
  }
}

function whereIs(command) {
  shell.echo(`Trying to find the command '${command}' locally..`);

  let result = shell.exec(`whereis ${command}`);
  let parsedOutput = result && result.output && result.output.split(':');

  return parsedOutput[1] && parsedOutput[1].trim('\n').split(' ');
}

function assertCommandCode(command, errorMessage) {
  if (shell.exec(command).code !== 0) {
    shell.echo(`Error: ${errorMessage}`);
    return shell.exit(1);
  }
}
