import 'mocha';

import * as _ from 'lodash';
import * as path from 'path';
import { expect } from 'chai';

import { config } from '../../ws.config/config';
import * as reposService from '../../ws.services/repos.service';

describe('repos service', () => {
  it('should properly extract repo name from github url', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should properly extract repo name from github url with branch included', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis#development';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#development`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should build repo name without branch name included if this branch is master', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#master`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should build repo name without branch name included if only "#" branch separator is given', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#master`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should return null when no account can be inferred from given url', () => {
    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:/ddf--gapminder--systema_globalis.git`);
    expect(actualRepoName).to.be.null;
  });

  it('should return null when no repo name can be inferred from given url', () => {
    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/`);
    expect(actualRepoName).to.be.null;
  });

  it('should throw away part .git from repo name', () => {
    const expectedDdfRepoName = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

    const actualRepoName = reposService.getRepoNameForDataset(expectedDdfRepoName);

    expect(_.endsWith(actualRepoName, '.git')).to.equal(false);
  });

  it('should properly extract path to repo stored locally', () => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const accountName = 'open-numbers';

    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');
    const actualPathToRepo = reposService.getPathToRepo(`git@github.com:${accountName}/${ddfRepoName}`);

    expect(actualPathToRepo).to.equal(expectedPathToRepo);
  });

  it('should return falsy value as is when it was passed as a github url', () => {
    const falsyInputs = [
      '',
      null,
      undefined
    ];

    falsyInputs.forEach((falsyInput: any) => {
      expect(reposService.getPathToRepo(falsyInput)).to.equal(falsyInput);
    });
  });
});
