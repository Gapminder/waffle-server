import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import * as _ from 'lodash';

const readdir   = promisify(fs.readdir);
const access    = promisify(fs.access);
const copyFile  = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);

const pathToRealDeploymentConfigs = path.resolve('./deployment/configs');
const pathToFixturesDeploymentConfig = path.resolve('./test/autodeploy/fixtures');

async function run(): Promise<void> {
  let files: string[];

  try {
    files = await readdir(pathToRealDeploymentConfigs);

    console.log('Config files: ', files);
  } catch (error) {
    console.warn('No config files were found\n', error);
    return;
  }

  files.forEach(createFixtureFromConfig);
}

async function createFixtureFromConfig(file: string): Promise<void> {
  const pathToConfig = path.resolve(pathToRealDeploymentConfigs, file);
  const pathToFixture = path.resolve(pathToFixturesDeploymentConfig, file);

  try {
    await access(pathToConfig, fs.constants.R_OK);
    await copyFile(pathToConfig, pathToFixture);

    const config = require(pathToFixture);
    const env = _.first(file.split('.')).toUpperCase();
    let counter = 0;

    const fixture = _.mapValues(config, (value: string | string[] | number | boolean) => {
      if (_.isString(value)) {
        return `${env}_${counter++}`;
      }
      if (_.isNumber(value)) {
        return counter++;
      }
      if (_.isArray(value)) {
        return [`${env}_${counter++}`];
      }
      return value;
    });

    writeFile(pathToFixture, JSON.stringify(fixture, null, 2));
  } catch (error) {
    console.warn('Can\'t create fixture for test\n', error);
  }
}

run();
