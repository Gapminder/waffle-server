import test from 'ava';
import * as _ from 'lodash';
import '../../../ws.config/db.config'
import '../../../ws.repository/index'
import importTranslationsService from './import-translations.service';

const translations = require('./fixtures/translations');

test.skip('should split into chunk huge array of translations', assert => {
  const splittedTranslationsChunks = importTranslationsService.divideWordsIntoChunks(translations)

  console.log(JSON.stringify(splittedTranslationsChunks, null, '\t'));

  assert.deepEqual(splittedTranslationsChunks.length, 7);
  assert.deepEqual(_.sumBy(splittedTranslationsChunks, 'length'), 1162);
});
