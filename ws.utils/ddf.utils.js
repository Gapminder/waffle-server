const _ = require('lodash');

module.exports = {
  filterTimeConcepts
};

function filterTimeConcepts(concepts) {
  return _.filter(concepts, concept => _.get(concept, 'properties.concept_type') === 'time');
}
