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

// const wsPath = 'https://waffle-server-stage.gapminder.org/api/ddf/ql';
const wsPath = 'http://localhost:3000';
const ghWsAcc = 'buchslava';
const fixturesPath = './test-bb/fixtures';

export const getTestObjectGroups = (): AbstractTestObject[] => [
  new DdfCsvReaderTestObject().forDataSuite(sg).init({path: `${fixturesPath}/${sg.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(sg).init({path: wsPath, dataset: `${ghWsAcc}/${sg.nick}`}),
  new DdfCsvReaderTestObject().forDataSuite(presentationSet).init({path: `${fixturesPath}/${presentationSet.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(presentationSet).init({
    path: wsPath,
    dataset: `${ghWsAcc}/${presentationSet.nick}`
  }),
  new DdfCsvReaderTestObject().forDataSuite(sankey).init({path: `${fixturesPath}/${sankey.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(sankey).init({path: wsPath, dataset: `${ghWsAcc}/${sankey.nick}`}),
  new DdfCsvReaderTestObject().forDataSuite(sgTiny).init({path: `${fixturesPath}/${sgTiny.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(sgTiny).init({path: wsPath, dataset: `${ghWsAcc}/${sgTiny.nick}`}),
  new DdfCsvReaderTestObject().forDataSuite(gmPopulation).init({path: `${fixturesPath}/${gmPopulation.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(gmPopulation).init({
    path: wsPath,
    dataset: `${ghWsAcc}/${gmPopulation.nick}`
  }),
  new DdfCsvReaderTestObject().forDataSuite(bubbles3).init({path: `${fixturesPath}/${bubbles3.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(bubbles3).init({path: wsPath, dataset: `${ghWsAcc}/${bubbles3.nick}`}),
  new DdfCsvReaderTestObject().forDataSuite(gmPopulationBig).init({path: `${fixturesPath}/${gmPopulationBig.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(gmPopulationBig).init({
    path: wsPath,
    dataset: `${ghWsAcc}/${gmPopulationBig.nick}`
  }),
  new DdfCsvReaderTestObject().forDataSuite(sgMixEntity).init({path: `${fixturesPath}/${sgMixEntity.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(sgMixEntity).init({
    path: wsPath,
    dataset: `${ghWsAcc}/${sgMixEntity.nick}`
  }),
  new DdfCsvReaderTestObject().forDataSuite(staticAssets).init({path: `${fixturesPath}/${staticAssets.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(staticAssets).init({
    path: wsPath,
    dataset: `${ghWsAcc}/${staticAssets.nick}`
  }),
  new DdfCsvReaderTestObject().forDataSuite(gmStaticAssets).init({path: `${fixturesPath}/${gmStaticAssets.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(gmStaticAssets).init({
    path: wsPath,
    dataset: `${ghWsAcc}/${gmStaticAssets.nick}`
  }),
  new DdfCsvReaderTestObject().forDataSuite(sodertornsmodellen).init({path: `${fixturesPath}/${sodertornsmodellen.nick}/master-HEAD`}),
  new WsProdServerTestObject().forDataSuite(sodertornsmodellen).init({
    path: wsPath,
    dataset: `${ghWsAcc}/${sodertornsmodellen.nick}`
  }),
];
