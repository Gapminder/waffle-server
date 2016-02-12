'use strict';

const mongoose = require('mongoose');
require('../../ws.repository/dimensions/dimensions.model');
require('../../ws.repository/dimension-values/dimension-values.model');

const suggestions = require('./suggestions.service');
const assert = require('chai').assert;
const sinon = require('sinon');

describe('Suggestions service (aka "magic")', () => {
  before(() => mongoose.connect('mongodb://localhost:27017/ws_test'));
  after(() => mongoose.disconnect());

  context('when there are no selected entities in the given state', () => {
    it('should use "parents_when_non_or_4_and_more_selected" rule for suggestion generation - showing "world_4region"', (done) => {
      const initState = {
        entities: [],
        entityConcepts: ['world_4region'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parents_when_non_or_4_and_more_selected: {
          entities: ['world'],
          entityConcepts: ['global']
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length === 1, 'Only one rule should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parents_when_non_or_4_and_more_selected');

        done();
      });
    });

    it('should use "parents_when_non_or_4_and_more_selected" rule for suggestion generation - should show global cause it is parent of world_4region and global by itself has no parents', (done) => {
      const initState = {
        entities: [],
        entityConcepts: ['global', 'world_4region'],
        measures: ['geo.latitude', 'geo.longitude'],
        time: '2015'
      };

      const expectedSuggestion = {
        parents_when_non_or_4_and_more_selected: {
          entities: ['world'],
          entityConcepts: ['global']
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length === 1, 'Only one rule should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parents_when_non_or_4_and_more_selected');

        done();
      });
    });

      it('should use "parents_when_non_or_4_and_more_selected" rule for suggestion generation - showing "world_4region" and "country"', (done) => {
        const initState = {
          entities: [],
          entityConcepts: ['country', 'world_4region'],
          measures: ['population', 'gini'],
          time: 2008
        };

        const expectedSuggestion = {
          parents_when_non_or_4_and_more_selected: {
            entities: [
              'world',
              'africa',
              'americas',
              'asia',
              'europe'
            ],
            entityConcepts: [
              'world_4region',
              'global'
            ]
          }
        };

        suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
          assert.notOk(error);
          assert.isTrue(Object.keys(actualSuggestion).length === 1, 'Only one rule should be applied');
          assertSuggestion(actualSuggestion, expectedSuggestion, 'parents_when_non_or_4_and_more_selected');

          done();
        });
    });

    it('should use "parents_when_non_or_4_and_more_selected" rule and multiple parents in drillup for suggestion generation', (done) => {
      const initState = {
        entities: [],
        entityConcepts: ['country'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parents_when_non_or_4_and_more_selected: {
          entities: [
            'world',
            'africa',
            'americas',
            'asia',
            'europe'
          ],
          entityConcepts: [
            'world_4region',
            'global'
          ]
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length === 1, 'Only one rule should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parents_when_non_or_4_and_more_selected');

        done();
      });
    });
  });

  context('when there is only one selected entity in the given state', () => {
    it('should use "children_of_selected" rule for suggestion generation - children of "world_4region" are "country" and "un_state"', (done) => {
      const initState = {
        entities: ['africa'],
        entityConcepts: ['world_4region'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        children_of_selected: {
          //TODO: data source should be mocked in order to return given entities
          entities: [
            'ago',
            'bdi',
            'ben',
            'bfa',
            'bouisl',
            'bwa',
            'caf',
            'civ',
            'cmr',
            'cod',
            'cog',
            'com',
            'cpv',
            'dji',
            'dza',
            'egy',
            'eri',
            'eri_a_eth',
            'esh',
            'eth',
            'gab',
            'gha',
            'gin',
            'gmb',
            'gnb',
            'gnq',
            'ken',
            'lbr',
            'lby',
            'lso',
            'mar',
            'mdg',
            'mli',
            'moz',
            'mrt',
            'mus',
            'mwi',
            'myt',
            'nam',
            'ner',
            'nga',
            'reu',
            'rwa',
            'sdn',
            'sen',
            'shn',
            'sle',
            'som',
            'som_somland',
            'ssd',
            'stp',
            'swz',
            'syc',
            'tcd',
            'tgo',
            'tun',
            'tza',
            'uga',
            'zaf',
            'zmb',
            'zwe'
          ],
          entityConcepts: ['country', 'un_state']
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length >= 1, 'One or more rules should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'children_of_selected');

        done();
      });
    });

    it('should use "children_of_selected" rule for suggestion generation - child of "global" is "world_4region"', (done) => {
      const initState = {
        entities: ['world'],
        entityConcepts: ['global'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        children_of_selected: {
          entities: [
            'africa',
            'americas',
            'asia',
            'europe'
          ],
          entityConcepts: ['world_4region']
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length >= 1, 'One or more rules should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'children_of_selected');

        done();
      });
    });

    it('should use "children_of_selected" rule for suggestion generation - "country" has no concept children so suggestion will be an empty suggestion', (done) => {
      const initState = {
        entities: ['ukr'],
        entityConcepts: ['country'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        children_of_selected: {
          entities: [],
          entityConcepts: []
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length >= 1, 'One or more rules should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'children_of_selected');

        done();
      });
    });

    it('should use "parent_when_one_selected" rule for suggestion generation - ukr and europe are active', (done) => {
      const initState = {
        entities: ['ukr'],
        entityConcepts: ['country'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parent_when_one_selected: {
          entities: [
            'ukr',
            'africa',
            'americas',
            'asia',
            'europe'
          ],
          activeEntities: [
            'ukr',
            'europe'
          ],
          entityConcepts: [
            'world_4region',
            'country'
          ]
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length >= 1, 'One or more rules should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parent_when_one_selected');

        done();
      });
    });

    it('should use "parent_when_one_selected" rule for suggestion generation - europe and world are active', (done) => {
      const initState = {
        entities: ['europe'],
        entityConcepts: ['world_4region'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parent_when_one_selected: {
          entities: [
            'europe',
            'world'
          ],
          activeEntities: [
            'europe',
            'world'
          ],
          entityConcepts: [
            'global',
            'world_4region'
          ]
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length >= 1, 'One or more rules should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parent_when_one_selected');

        done();
      });
    });

    it('should use "parent_when_one_selected" rule for suggestion generation - empty suggestion if concept entity doesn\'t have parent', (done) => {
      const initState = {
        entities: ['world'],
        entityConcepts: ['global'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parent_when_one_selected: {
          entities: [],
          entityConcepts: []
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length >= 1, 'One or more rules should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parent_when_one_selected');

        done();
      });
    });
  });

  context('when there are 2 to 4 (exclusively) selected entities in the given state', () => {
    it('should use "parents_when_2_to_4_selected" rule for suggestion generation - 2 entities selected', (done) => {
      const initState = {
        entities: ['ukr', 'europe'],
        entityConcepts: ['country', 'world_4region'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parents_when_2_to_4_selected: {
          entities: [
            'ukr',
            'europe',
            'world',
            'africa',
            'americas',
            'asia'
          ],
          entityConcepts: [
            'global',
            'world_4region',
            'country'
          ],
          activeEntities: [
            'world',
            'europe',
            'ukr'
          ]
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length === 1, 'Only one rule should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parents_when_2_to_4_selected');

        done();
      });
    });

    it('should use "parents_when_2_to_4_selected" rule for suggestion generation - 3 entities selected', (done) => {
      const initState = {
        entities: ['ukr', 'europe', 'dza'],
        entityConcepts: ['country', 'world_4region'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parents_when_2_to_4_selected: {
          activeEntities: [
            "africa",
            "world",
            "europe",
            "ukr",
            "dza"
          ],
          entities: [
            "ukr",
            "europe",
            "dza",
            "world",
            "africa",
            "americas",
            "asia"
          ],
          entityConcepts: [
            'world_4region',
            'global',
            'country'
          ]
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length === 1, 'Only one rule should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parents_when_2_to_4_selected');

        done();
      });
    });
  });

  context('when there are 4 or more selected entities in the given state', () => {
    it('should use "parents_when_non_or_4_and_more_selected" rule for suggestion generation', (done) => {
      const initState = {
        entities: ['ukr', 'europe', 'dza', 'afg'],
        entityConcepts: ['country', 'world_4region'],
        measures: ['population', 'gini'],
        time: 2008
      };

      const expectedSuggestion = {
        parents_when_non_or_4_and_more_selected: {
          entities: [
            'world',
            'africa',
            'americas',
            'asia',
            'europe'
          ],
          entityConcepts: [
            'world_4region',
            'global'
          ]
        }
      };

      suggestions.getSuggestionsBasedOn(initState, (error, actualSuggestion) => {
        assert.notOk(error);
        assert.isTrue(Object.keys(actualSuggestion).length === 1, 'Only one rule should be applied');
        assertSuggestion(actualSuggestion, expectedSuggestion, 'parents_when_non_or_4_and_more_selected');

        done();
      });
    });
  });
});

function assertSuggestion(actualSuggestion, expectedSuggestion, expectedRule) {
  assert.property(actualSuggestion, expectedRule, 'Wrong rule was applied');
  assert.deepEqual(actualSuggestion[expectedRule], expectedSuggestion[expectedRule], 'Suggestion was generated incorrectly');
}

