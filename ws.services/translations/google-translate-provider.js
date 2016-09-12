'use strict';

const _ = require("lodash");
const request = require("request");

const AMOUNT_OF_CHARACTERS_IN_SINGLE_REQUEST = 2000;

module.exports = (opts, onTranslated) => {
  opts = _.defaults(opts, {
    text: "text",
    source: "en",
    target: "se" // Sweden
  });

  if (_.size(opts.text) > AMOUNT_OF_CHARACTERS_IN_SINGLE_REQUEST) {
    return onTranslated(`Translated string should not be more than ${AMOUNT_OF_CHARACTERS_IN_SINGLE_REQUEST} characters long`);
  }

  return request.get({
    uri: makeTranslationServiceUrl(opts),
    encoding: "UTF-8",
  }, function (error, response, body) {
    if (error) {
      return onTranslated(error);
    }

    return toJson(body, (error, json) => {
      if (error) {
        onTranslated(error);
      }

      return onTranslated(null, _.get(json, '0.0.0'));
    });
  });
};

function makeTranslationServiceUrl(options) {
  return `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${options.source}&tl=${options.target}&dt=t&q=${encodeURI(options.text)}`;
}

function toJson(jsonString, done) {
  try {
    done(null, eval(jsonString));
  } catch (error) {
    done(error);
  }
}
