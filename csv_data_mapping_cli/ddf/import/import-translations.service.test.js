import test from 'ava';
import * as _ from 'lodash';
import '../../../ws.config/db.config'
import '../../../ws.repository/index'
import importTranslationsService from './import-translations.service';

const translations = require('./fixtures/translations');

test('should split into chunk huge array of translations', assert => {
  const splittedTranslationsChunks = importTranslationsService.divideWordsIntoChunks(translations)

  assert.deepEqual(splittedTranslationsChunks.length, 7);
  assert.deepEqual(_.sumBy(splittedTranslationsChunks, 'length'), 1162);

  assert.deepEqual(splittedTranslationsChunks[0], _.slice(translations, 0, 236));
  assert.deepEqual(splittedTranslationsChunks[1], _.slice(translations, 236, 416));
  assert.deepEqual(splittedTranslationsChunks[2], _.slice(translations, 416, 595));
  assert.deepEqual(splittedTranslationsChunks[3], _.slice(translations, 595, 836));
  assert.deepEqual(splittedTranslationsChunks[4], _.slice(translations, 836, 1052));
  assert.deepEqual(splittedTranslationsChunks[5], _.slice(translations, 1052, 1127));
  assert.deepEqual(splittedTranslationsChunks[6], _.slice(translations, 1127));
});
