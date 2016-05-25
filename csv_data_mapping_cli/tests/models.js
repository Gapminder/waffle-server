'use strict';

const _ = require('lodash');
const ddfModels = ['concepts','data-points','dataset-transactions','datasets','entities','original-entities','users'];

_.forEach(ddfModels, model => require(`../../ws.repository/ddf/${model}/${model}.model`));

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ws_ddf');

/* QUERY */

//mongoose.model("Concepts").find({"properties": {$elemMatch: {"concept":"geo"}}}, function(error, result){
//mongoose.model("Entities").find({"properties.concept_type": "entity_set"}, function(error, result){

//mongoose.model("Entities").find().where('domains').in(['geo']).exec(function(error, result){

//mongoose.model("Entities").find({'domain.gid': 'geo'}, null, {
mongoose.model("Entities").find({}, null, {
  join: {
    domain: {
      $find: {
        //'properties.concept': 'en'
        'properties.concept': 'translations'
      }
    }
  }
}).lean().exec(function(error, result){

  /* $find: {
   dataset: pipe.dataset._id,
   from: { $lte: pipe.transaction.createdAt },
   to: MAX_VALUE
   }
   */
  console.log("query::error", error);
  console.log("query::result", result.length);

  var filteredResult = result.filter(function(testVal){
    //return !!testVal.domain && testVal.domain.gid === 'translations' ? true : false;
    return !!testVal.domain && testVal.domain.gid === 'translations' ? true : false;
  });

  console.log("query::result", filteredResult.length);
  console.log("query::result", result[0]);

  mongoose.disconnect();
});

// populateWithOrigin(document, query, settings, done) {

/*

 { sources: [ 'se.json' ],
 sets: [ 5745a0995d2218e822b51384 ],
 drillups: [],
 to: 1.7976931348623157e+308,
 originId: 5745a09b5d2218e822b51bbc,
 __v: 0,
 transaction: 5745a0995d2218e822b5137b,
 dataset: 5745a0995d2218e822b5137c,
 from: 1464180889231,
 domain: 5745a0995d2218e822b51382,
 properties:
 { lng_value: 'Europa',
 lng_key: 'region/europe',
 language: 'se',
 value: 'Europa',
 key: 'region/europe' },
 title: 'Europa',
 gid: 'region/europe',
 _id: 5745a09b5d2218e822b51bbc },


*/
