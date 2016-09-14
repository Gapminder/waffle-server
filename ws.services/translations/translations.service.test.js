import test from 'ava';
import '../../ws.config/db.config'
import '../../ws.repository/index'

import translationService from './translations.service';

test.skip.cb('should translate given array of words via google translate', assert => {

  translationService.translateUsingGoogle(['hello', 'world'], {target: 'ru'}, (error, translatedText) => {

    assert.deepEqual(translatedText, { hello: 'привет', world: 'мир' });
    assert.end();
  });
});
