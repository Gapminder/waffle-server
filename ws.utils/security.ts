import * as _ from 'lodash';

export {
  validateDatasetOwner
};

function validateDatasetOwner(options, done) {
  const userId = _.toString(_.get(options.user, '_id'));
  const ownerId = _.toString(_.get(options.dataset, 'createdBy'));

  if (ownerId !== userId) {
    return done(`You cannot perform operations on dataset which is not created by you.`);
  }
  return done(null, options);
}
