import * as fs from 'fs-extra';
import * as path from 'path';
import * as threads from 'threads';
import * as _ from 'lodash';
import { logger } from '../../ws.config/log';
import { Observable, Subject } from 'rxjs';
import { RepoDescriptor } from './repo-descriptor';
import { DataSetManager } from './dataset-manager';
import { getFlattenReposConfig, Repository } from '../../ws.config/repos.config';
import 'rxjs/add/operator/mergeMap';

const importConfig = require('../../ws.config/import.config.json');
const spawn = threads.spawn;

const reposRootPath = path.resolve(importConfig.wsDatasetsOriginPath, 'ws-repos');
const importRootPath = path.resolve(importConfig.wsDatasetsImportPath, 'ws-import');

const importDataSet = async (repoDescriptor: RepoDescriptor) => {
  return new Promise((resolve: Function, reject: Function) => {
    const lockFileName = `${repoDescriptor.repoNickname.replace(/\//, '-')}.lock`;
    const lockFileNamePath = path.resolve(importRootPath, lockFileName);

    const isLockFileExists = fs.pathExistsSync(lockFileNamePath);

    if (isLockFileExists) {
      return resolve();
    }

    fs.writeFileSync(lockFileNamePath, new Date().toUTCString());

    const thread = spawn((input: any, done: Function) => done({
      repoDescriptor: input.repoDescriptor
    }));

    let res;

    thread
      .send({ repoDescriptor })
      .on('message', async (message: any) => {
        try {
          const dataSetManager = new DataSetManager(message.repoDescriptor, reposRootPath, importRootPath);

          await dataSetManager.initRepository();
          await dataSetManager.deleteExistingImportedDataSet();
          await dataSetManager.copyDataSetFromSourceToImported();
          const hash = await dataSetManager.checkoutToGivenCommit();

          res = `completed ${dataSetManager.repoNickname} ${dataSetManager.branch} ${hash}`;
        } catch (flowErr) {
          logger.error(flowErr);
        } finally {
          thread.kill();
          fs.removeSync(lockFileNamePath);
        }
      })
      .on('error', (error: any) => reject(error))
      .on('exit', () => {
        resolve(res);
      });
  });
};

export class ImportService {
  private prepareImportQueue: Subject<DataSetManager> = new Subject();
  private resultOfImport: Observable<any>;
  private issues: string[] = [];

  public constructor() {
    this.resultOfImport = this.prepareImportQueue.mergeMap((dataSetManager: DataSetManager) => importDataSet(dataSetManager), 1);
    this.resultOfImport.subscribe((imported: any) => logger.info(imported));
    this.validateConfig();
  }

  public async importByConfig(): Promise<void> {
    const repoDescriptors = await getFlattenReposConfig();
    if (this.isConfigValid()) {
      _.forEach(repoDescriptors, (repoDescriptor: Repository) => {
        this.prepareImportQueue.next(new DataSetManager(repoDescriptor, reposRootPath, importRootPath));
      });
    }
  }

  public isConfigValid(): boolean {
    return _.isEmpty(this.issues);
  }

  private async validateConfig(): Promise<void> {
    const repoDescriptors = await getFlattenReposConfig();

    this.issues = [];

    const defaults = {};

    let recordNo = 0;

    _.forEach(repoDescriptors, (repoDescriptor: Repository) => {
      if (!repoDescriptor.repoNickname) {
        this.issues.push(`repoNickname for record#${recordNo} is empty`);
        return;
      }

      if (repoDescriptor.isDefault) {
        if (!defaults[ repoDescriptor.repoNickname ]) {
          defaults[ repoDescriptor.repoNickname ] = 0;
        }

        defaults[ repoDescriptor.repoNickname ]++;
      }

      recordNo++;
    });

    const defaultsIssues = _.keys(defaults)
      .filter((key: string) => defaults[ key ] > 1)
      .map((key: string) => `more than one default for ${defaults[ key ]}`);

    this.issues.push(...defaultsIssues);
  }
}

const importService = new ImportService();

export { importService };
