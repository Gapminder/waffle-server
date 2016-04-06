#!/usr/bin/env node

'use strict';

const shell = require('shelljs');
const os = require('os');
const utils = require('./utils.runner');

const SWAGGER_UI_TAG = utils.config.SWAGGER_UI_TAG;
const WS_HOST = utils.config.WS_HOST;
const SWAGGER_UI_LINK_DEFAULT = utils.config.SWAGGER_UI_LINK_DEFAULT;
const SWAGGER_UI_INDEX_PATH = utils.config.SWAGGER_UI_INDEX_PATH;
const DEFAULT_COMMAND_FOR_OPEN_BROWSER = utils.config.DEFAULT_COMMAND_FOR_OPEN_BROWSER;
const OS_TYPE = os.type();
let commandOpenBrowserPage;

switch (OS_TYPE) {
  case 'Darwin':
    commandOpenBrowserPage = DEFAULT_COMMAND_FOR_OPEN_BROWSER || 'open';
    break;
  case 'Linux':
    commandOpenBrowserPage = DEFAULT_COMMAND_FOR_OPEN_BROWSER || 'sensible-browser';
    break;
  default:
    // echo(`Error: Your operation system isn't supported yet`);
    // exit(1);
    break;
}

utils.assertCommandExists('git');
utils.assertCommandExists(commandOpenBrowserPage);
shell.exec('npm run swagger');
shell.rm('-rf', 'swagger-ui');
utils.assertCommandCode('git clone git@github.com:swagger-api/swagger-ui.git', 'Git clone of swagger-ui repo was failed');
shell.cd('swagger-ui');
utils.assertCommandCode(`git checkout tags/${SWAGGER_UI_TAG}`, `Git checkout on tag ${SWAGGER_UI_TAG} in swagger-ui repo was failed`);
shell.sed('-i', SWAGGER_UI_LINK_DEFAULT, WS_HOST, SWAGGER_UI_INDEX_PATH);
shell.exec(`${commandOpenBrowserPage} ${SWAGGER_UI_INDEX_PATH}`);
shell.cd('..');
shell.exit(0);
