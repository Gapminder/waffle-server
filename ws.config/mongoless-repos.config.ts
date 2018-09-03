const reposConfig = require('./repos.config');

function getRepositoryDescriptors(): any {
  const res = {
    repositoryDescriptors: {},
    defaultRepository: '',
    defaultRepositoryCommit: '',
    defaultRepositoryBranch: ''
  };

  for (const reposConfigRecord of reposConfig) {
    if (!res.repositoryDescriptors[reposConfigRecord.repoNickname]) {
      res.repositoryDescriptors[reposConfigRecord.repoNickname] = {};
    }

    if (reposConfigRecord.branch && !res.repositoryDescriptors[reposConfigRecord.repoNickname].branch) {
      res.repositoryDescriptors[reposConfigRecord.repoNickname][reposConfigRecord.branch] = [];
    }

    if (reposConfigRecord.hash) {
      res.repositoryDescriptors[reposConfigRecord.repoNickname][reposConfigRecord.branch].push(reposConfigRecord.hash);
    }

    if (reposConfigRecord.isDefault) {
      res.defaultRepository = reposConfigRecord.repoNickname;
      res.defaultRepositoryBranch = reposConfigRecord.branch;
      res.defaultRepositoryCommit = reposConfigRecord.hash;
    }
  }

  return res;
}

export const {repositoryDescriptors, defaultRepository, defaultRepositoryCommit, defaultRepositoryBranch} = getRepositoryDescriptors();
