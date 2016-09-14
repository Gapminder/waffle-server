'use strict';

const _ = require("lodash");
const request = require("request");
const striptags = require("striptags");
const entities = require("entities");
const Nightmare = require("nightmare");
const nightmare = Nightmare({show: false, waitTimeout: 2000});

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

  return nightmare
    .goto(makeTranslationServiceUrl(opts))
    .evaluate(function () {
      return document.querySelector('#result_box').innerHTML;
    })
    .end()
    .then(function (html) {
      onTranslated(null, entities.decodeHTML(striptags(html)));
    })
    .catch(function (error) {
      onTranslated(error);
    });
};

function makeTranslationServiceUrl(options) {
  return `https://translate.google.com/#${options.source}/${options.target}/${encodeURI(options.text)}`;
}
