import * as _ from 'lodash';
import { logger } from './log';
import { getS3FileReaderObject } from 'vizabi-ddfcsv-reader';
import { config } from './config';

export interface Repository {
  repoNickname: string;
  branch: string;
  hash: string;
  isHEAD?: boolean;
  isDefault?: boolean;
}

export interface RepositoriesConfig {
  repositoryDescriptors: object;
  defaultRepository: string;
  defaultRepositoryCommit: string;
  defaultRepositoryBranch: string;
  resource: string;
  cached: boolean;
}

const cachedRepositoryConfig: RepositoriesConfig = {
  repositoryDescriptors: {},
  defaultRepository: '',
  defaultRepositoryCommit: '',
  defaultRepositoryBranch: '',
  resource: 'default',
  cached: true
};

export async function loadRepositoriesConfig(isForceLoad: boolean = false): Promise<RepositoriesConfig> {
  try {
    if (!isForceLoad) {
      return cachedRepositoryConfig;
    }
    const options = { ResponseCacheControl: 'no-cache' };
    const ddfcsvReader = getS3FileReaderObject();
    ddfcsvReader.init({});
    const reposConfig = await ddfcsvReader.getFile(config.PATH_TO_REPOS_CONFIG, true, options);
    Object.assign(cachedRepositoryConfig, reposConfig, { resource: `s3://${config.S3_BUCKET}/${config.PATH_TO_REPOS_CONFIG}` });

    return Object.assign({}, cachedRepositoryConfig, { cached: false });
  } catch (error) {
    logger.error(error);
  }

  try {
    const reposConfig = require('./repos-config.json');
    return Object.assign(cachedRepositoryConfig, reposConfig, { resource: 'waffle-server://ws.config/repos-config.json' });
  } catch (error) {
    logger.error(error);
  }

  return Object.assign(cachedRepositoryConfig, { resource: 'default' });
}

export async function getFlattenReposConfig(): Promise<object> {
  const reposConfig: RepositoriesConfig = await loadRepositoriesConfig();

  return _.reduce(reposConfig.repositoryDescriptors, (result: object[], branches: object, repoNickName: string) => {
    _.forEach(branches, (hashes: string[], branch: string) => {
      _.forEach(hashes, (hash: string, index: number) => {
          result.push({
            repoNickName, branch, hash,
            isHEAD: index === 0,
            isDefault: repoNickName === reposConfig.defaultRepository && branch === reposConfig.defaultRepositoryBranch && hash === reposConfig.defaultRepositoryCommit
          });
      });
    });
    return result;
  }, []);
}

export async function getPossibleAssetsRepoPaths(): Promise<object> {
  const reposConfig: RepositoriesConfig = await loadRepositoriesConfig();

  return _.reduce(reposConfig.repositoryDescriptors, (result: object, repoBranches: object, repoNickname: string) => {
    if (repoNickname === reposConfig.defaultRepository) {
      result[ 'default' ] = {
        repoNickname: reposConfig.defaultRepository,
        branch: reposConfig.defaultRepositoryBranch,
        hash: reposConfig.defaultRepositoryCommit,
        isDefault: true
      };
    }

    _.forEach(repoBranches, (hashes: string[], branch: string) => {
      _.forEach(hashes, (hash: string, index: number) => {
        const isHEAD: boolean = (index === 0);
        const isMaster: boolean = (branch === 'master');
        if (isMaster) {
          result[ `${repoNickname}` ] = {
            repoNickname,
            branch,
            hash,
            isMaster: true
          };
        }
        if (isHEAD) {
          result[ `${repoNickname}/${branch}` ] = {
            repoNickname,
            branch,
            hash,
            isHEAD: true
          };
          result[ `${repoNickname}/${branch}/HEAD` ] = {
            repoNickname,
            branch,
            hash,
            isHEAD: true
          };
        }
        result[ `${repoNickname}/${branch}/${hash}` ] = {
          repoNickname,
          branch,
          hash
        };
      });
    });

    return result;
  }, {});
}
