'use strict';

const _ = require('lodash');
const expect = require('expect.js');
const shelljs = require("shelljs/global");
const mongoose = require('mongoose');

// load models
const ddfModels = ['concepts','data-points','dataset-transactions','datasets','entities','original-entities','users'];
_.forEach(ddfModels, model => require(`../../ws.repository/ddf/${model}/${model}.model`));

/***************/

var execResult;

var fixturePath = 'PATH_TO_DDF_FOLDER=../ddf--gapminder_world/output/ddf-stub-integration-test ';

var commandBase = 'MONGODB_URL=mongodb://@localhost:27017/ws_ddf ';
commandBase += 'NEO4J_URL=http://neo4j:neo4j@localhost:7474 ';
commandBase += 'NODE_ENV=development ';
commandBase += 'LOG_LEVEL=debug ';
commandBase += 'LOG_TRANSPORTS=console,file ';
commandBase += 'GOOGLE_CLIENT_ID=t ';
commandBase += 'GOOGLE_CLIENT_SECRET=t ';
commandBase += 'SESSION_SECRET=t ';
commandBase += 'CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT=true ';
commandBase += 'ACTION=ddf-world2 ';
commandBase += 'USE_GEO_MAPPING=true ';
commandBase += 'node ./csv_data_mapping_cli/index.js';

var commandExec = fixturePath + commandBase;
var isImportOn = true;

describe("Integration Tests for Importer", function() {

  if(isImportOn) {

    this.timeout(60 * 10 * 10);
    execResult = exec(commandExec, {silent: true});

    it("Execution Result", function () {

      expect(execResult.code).to.be(0);

    });
  }

  // db connect

  mongoose.connect('mongodb://localhost:27017/ws_ddf');

  describe("Concepts", function() {

    it("should have exact count and gid field value of documents", function(done) {

      mongoose.model("Concepts").find(function(error, result){

        var found = 19;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["geo", "country", "main_religion_2008", "world_4region", "geographic_regions", "translations","en", "se", "time",
          "year", "language", "description", "name", "color", "unit", "latitude", "longitude", "sg_population", "energy_supply_per_person_toe"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

    it("should have exact count of different conceptTypes", function(done) {

      mongoose.model("Concepts").find().distinct("properties.concept_type", function(error, result){

        var found = 4;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);
        done();

      });

    });

    it("should have exact count and data of conceptTypes like 'entity_set'", function(done) {

      mongoose.model("Concepts").find({"properties.concept_type": "entity_set"}, function(error, result){

        var found = 7;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["country", "main_religion_2008", "world_4region", "geographic_regions", "en", "se", "year"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

    it("should have exact count and data of conceptTypes like 'string'", function(done) {

      mongoose.model("Concepts").find({"properties.concept_type": "string"}, function(error, result){

        var found = 5;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["language", "description", "name", "color", "unit"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

    it("should have exact count and data of conceptTypes like 'entity_domain'", function(done) {

      mongoose.model("Concepts").find({"properties.concept_type": "entity_domain"}, function(error, result){

        var found = 3;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["geo", "translations", "time"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

    it("should have exact count and data of conceptTypes like 'measure'", function(done) {

      mongoose.model("Concepts").find({"properties.concept_type": "measure"}, function(error, result){

        var found = 4;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["latitude", "longitude", "sg_population", "energy_supply_per_person_toe"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

    it("should have exact EntitySets count and data for Domain 'geo'", function(done) {

      mongoose.model("Concepts").find({"properties.concept_type": "entity_set", "properties.domain": "geo"}, function(error, result){

        var found = 4;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["country", "main_religion_2008", "world_4region", "geographic_regions"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

    it("should have exact EntitySets count and data for Domain 'translations'", function(done) {

      mongoose.model("Concepts").find({"properties.concept_type": "entity_set", "properties.domain": "translations"}, function(error, result){

        var found = 2;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["en", "se"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

    it("should have exact EntitySets count and data for Domain 'time'", function(done) {

      mongoose.model("Concepts").find({"properties.concept_type": "entity_set", "properties.domain": "time"}, function(error, result){

        var found = 1;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = ["year"];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

  });

  describe("Entities", function() {

    it("should have exact count of documents", function(done) {

      mongoose.model("Entities").find(function(error, result){

        var found = 2055;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);
        done();

      });

    });

    it("should have exact count of Entities for Domain 'geo'", function(done) { done(); });
    it("should have exact count of Entities for Domain 'time'", function(done) { done(); });
    it("should have exact count of Entities for Domain 'translations'", function(done) { done(); });

    it("should have exact count of Entities for EntitySet ''", function(done) { done(); });
    it("should have exact count of Entities for EntitySet ''", function(done) { done(); });
    it("should have exact count of Entities for EntitySet ''", function(done) { done(); });

  });

  describe("DataPoints", function() {

    it("should have exact count of documents", function(done) {

      mongoose.model("DataPoints").find(function(error, result){

        var found = 11;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        var foundExact = [];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

  });

  describe("Datasets", function() {

    it("should have exact count of documents", function(done) {

      mongoose.model("Datasets").find(function(error, result){

        var found = 1;
        expect(error).to.equal(null);
        expect(result.length).to.be(found);

        var resultCollected = result.map(function(document) {
          return document.gid;
        });

        console.log("resultCollected", resultCollected);

        var foundExact = [];
        expect(foundExact).to.eql(resultCollected);
        done();

      });

    });

  });

});

