import '../../../ws.repository';

import * as sinon from 'sinon';
import { expect } from 'chai';

import * as entitiesUtils from '../../../ws.import/utils/entities.utils';

describe('Entities utils', () => {
  it('it should correctly detect entity sets and domain', sinon.test(function () {
    const resource = {
      concept: 'foundation',
      entitySets: ['foundation']
    };

    const context = {
      concepts: {
        foundation: {
          type: 'entity_set',
          domain: {
            gid: 'company'
          },
          originId: 'foundationId'
        }
      },
    };

    const expectedSetsAndDomain = {
      entitySet: context.concepts.foundation,
      entityDomain: context.concepts.foundation.domain,
      entitySetsOriginIds: ['foundationId']
    };

    const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': true });
    expect(setsAndDomain).to.deep.equal(expectedSetsAndDomain);

    const setsAndDomainWithBigTrue = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': 'TRUE' });
    expect(setsAndDomainWithBigTrue).to.deep.equal(expectedSetsAndDomain);
  }));

  it('it should correctly detect entity sets and domain: concepts might be taken from prev versions', sinon.test(function () {
    const resource = {
      concept: 'foundation',
      entitySets: ['foundation']
    };

    const context = {
      concepts: {},
      previousConcepts: {
        foundation: {
          type: 'entity_set',
          domain: {
            gid: 'company'
          },
          originId: 'foundationId'
        }
      },
    };

    const expectedSetsAndDomain = {
      entitySet: context.previousConcepts.foundation,
      entityDomain: context.previousConcepts.foundation.domain,
      entitySetsOriginIds: ['foundationId']
    };

    const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': true });
    expect(setsAndDomain).to.deep.equal(expectedSetsAndDomain);
  }));

  it('it should correctly detect entity sets and domain: concepts might be taken from both prev and current versions', sinon.test(function () {
    const resource = {
      concept: 'foundation',
      entitySets: ['foundation', 'english_speaking']
    };

    const context = {
      concepts: {
        domain: {
          gid: 'company'
        },
        english_speaking: {
          originId: 'english_speakingId'
        }
      },
      previousConcepts: {
        foundation: {
          type: 'entity_set',
          domain: {
            gid: 'company'
          },
          originId: 'foundationId'
        }
      },
    };

    const expectedSetsAndDomain = {
      entitySet: context.previousConcepts.foundation,
      entityDomain: context.previousConcepts.foundation.domain,
      entitySetsOriginIds: ['foundationId', 'english_speakingId']
    };

    const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': true, 'is--english_speaking': true });
    expect(setsAndDomain).to.deep.equal(expectedSetsAndDomain);
  }));

  it('it should correctly detect entity sets and domain: entity might not have entity_set', sinon.test(function () {
    const resource = {
      concept: 'foundation',
      entitySets: []
    };

    const context = {
      concepts: {
        foundation: {
          type: 'entity_domain',
          originId: 'foundationId'
        }
      },
    };

    const expectedSetsAndDomain = {
      entitySet: context.concepts.foundation,
      entityDomain: context.concepts.foundation,
      entitySetsOriginIds: []
    };

    const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': true });
    expect(setsAndDomain).to.deep.equal(expectedSetsAndDomain);
  }));

  it('it should not take into account set which is disabled by "is--" operator', sinon.test(function () {
    const resource = {
      concept: 'foundation',
      entitySets: ['foundation']
    };

    const context = {
      concepts: {
        foundation: {
          type: 'entity_set',
          domain: {
            gid: 'company'
          },
          originId: 'foundationId'
        }
      },
    };

    const expectedSetsAndDomain = {
      entitySet: context.concepts.foundation,
      entityDomain: context.concepts.foundation.domain,
      entitySetsOriginIds: []
    };

    const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': false });
    expect(setsAndDomain).to.deep.equal(expectedSetsAndDomain);

    const setsAndDomainWithBigTrue = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': 'FALSE' });
    expect(setsAndDomainWithBigTrue).to.deep.equal(expectedSetsAndDomain);
  }));

  it('it should correctly detect entity sets and domain: entity_domain and entity_set are taken from the resource\'s concept', sinon.test(function () {
    const resource = {
      concept: 'company',
      entitySets: ['foundation', 'english_speaking']
    };

    const companyDomain = {
      gid: 'company',
      originId: 'originId',
      type: 'entity_domain'
    };

    const context = {
      concepts: {
        company: companyDomain,
        english_speaking: {
          type: 'entity_set',
          domain: companyDomain,
          originId: 'english_speakingId'
        }
      },
      previousConcepts: {
        foundation: {
          type: 'entity_set',
          domain: companyDomain,
          originId: 'foundationId'
        }
      },
    };

    const expectedSetsAndDomain = {
      entitySet: context.concepts.company,
      entityDomain: context.concepts.company,
      entitySetsOriginIds: ['foundationId', 'english_speakingId']
    };

    const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, context, { 'is--foundation': true, 'is--english_speaking': true });
    expect(setsAndDomain).to.deep.equal(expectedSetsAndDomain);
  }));
});
