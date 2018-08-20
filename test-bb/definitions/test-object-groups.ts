import { AbstractTestObject } from 'bb-tests-provider/dist';
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
  sodertornsmodellen
} from './data-suite-registry';
import { DdfCsvReaderTestObject, WsProdServerTestObject } from '../test-objects';
import * as _ from 'lodash';
import { defaultRepository, defaultRepositoryBranch, defaultRepositoryCommit, repositoryDescriptors } from '../../ws.config/mongoless-repos.config';
import { GitUtils } from '../../ws.routes/ddfql/git-utils';

// const wsPath = 'https://waffle-server-stage.gapminder.org/api/ddf/ql';
const wsPath = 'http://localhost:3000/api/ddf/ql/urlon';
const fixturesPath = './test-bb/fixtures';

const datasetsConfig = _.chain(repositoryDescriptors)
  .cloneDeep()
  .mapKeys((value: object, key: string) => {
    return GitUtils.getRepositoryNameByUrl(key);
  })
  .mapValues((datasetConfig: object) => {
    if (_.isEmpty(datasetConfig)) {
      return {master: ['HEAD']};
    }
    return _.mapValues(datasetConfig, (commits: string[]) => _.isEmpty(commits) ? ['HEAD'] : commits);
  })
  .defaults({'default': {
    dataset: GitUtils.getRepositoryNameByUrl(defaultRepository),
    branch: defaultRepositoryBranch,
    commit: defaultRepositoryCommit
  }})
  .value();

export const getTestObjectGroups = (): AbstractTestObject[] => [
  new DdfCsvReaderTestObject().forDataSuite(sg).init({path: `${fixturesPath}/${sg.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(sg).init({path: wsPath, dataset: sg.getDataset()}),
  new DdfCsvReaderTestObject().forDataSuite(presentationSet).init({path: `${fixturesPath}/${presentationSet.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(presentationSet).init({
    path: wsPath,
    dataset: presentationSet.getDataset()
  }),
  new DdfCsvReaderTestObject().forDataSuite(sankey).init({path: `${fixturesPath}/${sankey.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(sankey).init({path: wsPath, dataset: sankey.getDataset()}),
  new DdfCsvReaderTestObject().forDataSuite(sgTiny).init({path: `${fixturesPath}/${sgTiny.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(sgTiny).init({path: wsPath, dataset: sgTiny.getDataset()}),
  new DdfCsvReaderTestObject().forDataSuite(gmPopulation).init({path: `${fixturesPath}/${gmPopulation.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(gmPopulation).init({
    path: wsPath,
    dataset: gmPopulation.getDataset()
  }),
  new DdfCsvReaderTestObject().forDataSuite(bubbles3).init({path: `${fixturesPath}/${bubbles3.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(bubbles3).init({path: wsPath, dataset: bubbles3.getDataset()}),
  new DdfCsvReaderTestObject().forDataSuite(gmPopulationBig).init({path: `${fixturesPath}/${gmPopulationBig.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(gmPopulationBig).init({
    path: wsPath,
    dataset: gmPopulationBig.getDataset()
  }),
  new DdfCsvReaderTestObject().forDataSuite(sgMixEntity).init({path: `${fixturesPath}/${sgMixEntity.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(sgMixEntity).init({
    path: wsPath,
    dataset: sgMixEntity.getDataset()
  }),
  new DdfCsvReaderTestObject().forDataSuite(staticAssets).init({path: `${fixturesPath}/${staticAssets.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(staticAssets).init({
    path: wsPath,
    dataset: staticAssets.getDataset()
  }),
  new DdfCsvReaderTestObject().forDataSuite(gmStaticAssets).init({path: `${fixturesPath}/${gmStaticAssets.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(gmStaticAssets).init({
    path: wsPath,
    dataset: gmStaticAssets.getDataset()
  }),
  new DdfCsvReaderTestObject().forDataSuite(sodertornsmodellen).init({path: `${fixturesPath}/${sodertornsmodellen.datasetNick}/master-HEAD`, datasetsConfig}),
  new WsProdServerTestObject().forDataSuite(sodertornsmodellen).init({
    path: wsPath,
    dataset: sodertornsmodellen.getDataset()
  })
];
