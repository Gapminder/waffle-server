import { e2eEnv } from '../../e2e.env';
import * as e2eUtils from '../../e2e.utils';

const versions = new Map<string, string>();

const INDEX_OF_INITIAL_COMMIT = 0;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

describe('Multiple datasets in WS', function() {

  if (COMMIT_INDEX_TO_IMPORT > INDEX_OF_INITIAL_COMMIT) {
    return;
  }

  before(() => {
    const commit1 = getCommitForGivenIndex(0, e2eEnv.repo);
    const commit2 = getCommitForGivenIndex(9, e2eEnv.repo2);

    return Promise.all([commit1, commit2]).then((commits) => {
      versions.set(e2eEnv.datasetName, commits[0]);
      versions.set(e2eEnv.datasetName2, commits[1]);
    });
  });

  it('can serve data from multiple datasets at once', function () {
    const ddfql = {
      dataset: e2eEnv.datasetName,
      version: versions.get(e2eEnv.datasetName),
      select: {
        key: ['concept'],
        value: [
          'concept_type'
        ]
      },
      from: 'concepts',
      where: {
        $and: [
          {domain: 'company'}
        ]
      },
      order_by: ['concept']
    };

    const ddfql2 = Object.assign({}, ddfql, {
      dataset: e2eEnv.datasetName2,
      version: versions.get(e2eEnv.datasetName2)
    });

    const expectedResultDataset1 = {
      headers:['concept', 'concept_type'],
      rows: [
        ['company_size', 'entity_set'],
        ['english_speaking', 'entity_set'],
        ['foundation', 'entity_set']
      ]
    };

    const expectedResultDataset2 = {
      headers:['concept', 'concept_type'],
      rows: [
        ['company_scale', 'entity_set'],
        ['english_speaking', 'entity_set']
      ]
    };

    return Promise.all([
      sendDdfqlRequestAndVerifyResponse(ddfql, expectedResultDataset1),
      sendDdfqlRequestAndVerifyResponse(ddfql2, expectedResultDataset2)
    ]);
  });
});

function getCommitForGivenIndex(index: number, repo: string): Promise<string> {
  return e2eEnv[repo].commitsList[index];
}

function sendDdfqlRequestAndVerifyResponse(ddfql, expectedResult): Promise<any> {
  return new Promise((resolve: Function) => e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, expectedResult, resolve));
}
