import { AbstractTestObject } from 'bb-tests-provider';
import {
  sg,
  presentationSet,
  sankey,
  sgTiny,
  gmPopulation,
  bubbles3,
  gmPopulationBig,
  sgMixEntity,
  staticAssets,
  gmStaticAssets,
  sodertornsmodellen,
  wsTesting
} from './data-suite-registry';
import { DdfCsvReaderTestObject, WsDevServerTestObject, WsNewServerTestObject } from '../test-objects';
import { chain, isEmpty, mapValues } from 'lodash';
import { defaultRepository, defaultRepositoryBranch, defaultRepositoryCommit, repositoryDescriptors } from '../../ws.config/mongoless-repos.config';
import { DataSuite } from 'bb-tests-provider';

const wsDevPath = 'https://waffle-server-dev.gapminderdev.org/api/ddf/ml-ql';
const wsNewPath = 'http://localhost:3000/api/ddf/ql';
const fixturesPath = './test-bb/fixtures';
const getRepositoryNameByUrl = (repoUrl: string): string => {
  if (repoUrl.indexOf(':') === -1) {
    return repoUrl;
  }

  try {
    return repoUrl.split(':')[1].replace(/\.git$/, '');
  } catch (error) {
    return null;
  }
};
const datasetsConfig = chain(repositoryDescriptors)
  .cloneDeep()
  .mapKeys((value: object, key: string) => getRepositoryNameByUrl(key))
  .mapValues((datasetConfig: object) => {
    if (isEmpty(datasetConfig)) {
      return {master: ['HEAD']};
    }

    return mapValues(datasetConfig, (commits: string[]) => isEmpty(commits) ? ['HEAD'] : commits);
  })
  .defaults({
    default: {
      dataset: getRepositoryNameByUrl(defaultRepository),
      branch: defaultRepositoryBranch,
      commit: defaultRepositoryCommit
    }
  })
  .value();

function getTestObjectsForDataSuite(ds: DataSuite): AbstractTestObject[] {
  return [
    new DdfCsvReaderTestObject().forDataSuite(ds).init({path: `${fixturesPath}/`, datasetsConfig}),
    new WsNewServerTestObject().forDataSuite(ds).init({path: wsNewPath, dataset: ds.getDataset()}),
    new WsDevServerTestObject().forDataSuite(ds).init({path: wsDevPath, dataset: ds.getDataset()})
  ];
}

export const getTestObjectGroups = (): AbstractTestObject[] => [
  ...getTestObjectsForDataSuite(sg),
  ...getTestObjectsForDataSuite(presentationSet),
  ...getTestObjectsForDataSuite(sankey),
  ...getTestObjectsForDataSuite(sgTiny),
  ...getTestObjectsForDataSuite(gmPopulation),
  ...getTestObjectsForDataSuite(bubbles3),
  ...getTestObjectsForDataSuite(gmPopulationBig),
  ...getTestObjectsForDataSuite(sgMixEntity),
  ...getTestObjectsForDataSuite(staticAssets),
  ...getTestObjectsForDataSuite(gmStaticAssets),
  ...getTestObjectsForDataSuite(sodertornsmodellen),
  ...getTestObjectsForDataSuite(wsTesting)
];
