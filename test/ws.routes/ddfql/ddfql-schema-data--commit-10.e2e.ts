import * as e2eUtils from '../../e2e.utils';
import {e2eEnv} from '../../e2e.env';
import { config } from '../../../ws.config/config';

import * as fixtureDatapointsLinesOfCodeByCompanyScaleAnno from './fixtures/commit-10--datapoints-linesofcode_by_company_scale_anno.json';
import * as fixtureDatapointsLinesOfCodeByCompanyAnno from './fixtures/commit-10--datapoints-linesofcode_by_company_anno.json';
import * as fixtureDatapointsMeetingStyleCompanyScaleAnno from './fixtures/commit-10--datapoints-meeting_style_by_company_scale_anno.json';
import * as fixtureDatapointsMeetingStyleCompanyAnno from './fixtures/commit-10--datapoints-meeting_style_by_company_anno.json';
import * as fixtureDatapointsMeetingStyleCompanyScaleProjectAnno from './fixtures/commit-10--datapoints-meeting_style_by_company_scale_project_anno.json';
import * as fixtureDatapointsMeetingStyleCompanyProjectAnno from './fixtures/commit-10--datapoints-meeting_style_by_company_project_anno.json';
import * as fixtureDatapointsMeetingStyleEnglishSpeakingProjectAnno from './fixtures/commit-10--datapoints-meeting_style_by_english_speaking_project_anno.json';

const INDEX_OF_NINTH_COMMIT = 9;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

describe('State Version 10 (10th commit)', function() {
  if (COMMIT_INDEX_TO_IMPORT) {
    return;
  }

  before(() => {
    config.DEFAULT_DATASETS = e2eEnv.repo;
    config.DEFAULT_DATASETS_VERSION = e2eEnv[INDEX_OF_NINTH_COMMIT];
  });

  it('should return all datapoints of lines_of_code indicators for company_scale and anno', (done: Function) => {
    const ddfql = {
      select: {
        key: ['company_scale', 'anno'],
        value: [
          'lines_of_code'
        ]
      },
      from: 'datapoints',

      where: {}
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyScaleAnno, done);
  });

  it('should return all datapoints of lines_of_code indicators for company and anno', (done: Function) => {
    const ddfql = {
      select: {
        key: ['company', 'anno'],
        value: [
          'lines_of_code'
        ]
      },
      from: 'datapoints',

      where: {},
      order_by: [
        'lines_of_code'
      ]
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyAnno, done);
  });

  it('should return all datapoints of meeting_style indicators for company_scale and anno', (done: Function) => {
    const ddfql = {
      select: {
        key: ['company_scale', 'anno'],
        value: [
          'meeting_style'
        ]
      },
      from: 'datapoints',

      where: {}
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsMeetingStyleCompanyScaleAnno, done);
  });

  it('should return all datapoints of meeting_style indicators for company and anno', (done: Function) => {
    const ddfql = {
      select: {
        key: ['company', 'anno'],
        value: [
          'meeting_style'
        ]
      },
      from: 'datapoints',

      where: {}
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsMeetingStyleCompanyAnno, done);
  });

  it('should return all datapoints of meeting_style indicators for company_scale, project and anno', (done: Function) => {
    const ddfql = {
      select: {
        key: ['company_scale', 'anno', 'project'],
        value: [
          'meeting_style'
        ]
      },
      from: 'datapoints',

      where: {}
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsMeetingStyleCompanyScaleProjectAnno, done);
  });

  it('should return all datapoints of meeting_style indicators for english_speaking, project and anno', (done: Function) => {
    const ddfql = {
      select: {
        key: ['english_speaking', 'anno', 'project'],
        value: [
          'meeting_style'
        ]
      },
      from: 'datapoints',

      where: {}
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsMeetingStyleEnglishSpeakingProjectAnno, done);
  });

  it('should return all datapoints of meeting_style indicators for company, project and anno', (done: Function) => {
    const ddfql = {
      select: {
        key: ['company', 'anno', 'project'],
        value: [
          'meeting_style'
        ]
      },
      from: 'datapoints',

      where: {}
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsMeetingStyleCompanyProjectAnno, done);
  });
});
