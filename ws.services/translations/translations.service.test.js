import test from 'ava';
// import '../../ws.config/db.config'
// import translationService from './translations.service';

test.skip.cb('test cb', assert => {

  translationService.translateUsingGoogle(['hello', 'world', 'uniqueness'], {target: 'ru'}, (error, translatedText) => {

    assert.deepEqual(translatedText, ['привет', 'мир', 'уникальность']);
    assert.end();
  });
});
