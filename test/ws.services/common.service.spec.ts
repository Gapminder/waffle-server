import * as sinon from 'sinon';
import { expect } from 'chai';

import * as commonService from '../../ws.services/common.service';

const sandbox = sinon.createSandbox();

describe('Common Service', function () {

  afterEach(() => sandbox.restore());

  it('should not translate document when language not given', () => {
    const doc = {
      properties: {}
    };
    expect(commonService.translateDocument(doc, null)).to.equal(doc.properties);
  });

  it('should not translate doc when it does not have a translation for given lang', () => {
    const doc = {
      properties: {}
    };
    expect(commonService.translateDocument(doc, 'en')).to.equal(doc.properties);
  });

  it('should not translate doc when it does not have a translation for given lang', () => {
    const lang = 'en';

    const doc = {
      properties: {
        name: 'Привет',
        description: 'Описание'
      },
      languages: {
        [lang]: {
          name: 'Hello'
        }
      }
    };
    expect(commonService.translateDocument(doc, 'en')).to.deep.equal({
      name: 'Hello',
      description: 'Описание'
    });
  });

});
