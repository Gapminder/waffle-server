'use strict';

const _ = require('lodash');
const async = require('async');
const express = require('express');

const logger = require('../../../ws.config/log');
const routeUtils = require('../../utils');
const commonService = require('../../../ws.services/common.service');
const translationsImporter = require('../../../ws.import/import-translations.service');
const conceptsRepositoryFactory = require('../../../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');


module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();
  const router = express.Router();

  router.use(routeUtils.ensureAuthenticatedViaToken);
  router.post('/api/ddf/translations/import', updateTranslations);

  return app.use(router);

  function updateTranslations(req, res) {
    async.waterfall([
      async.constant({}),
      commonService.findDefaultDatasetAndTransaction,
      getConceptsAndEntities,
      translationsImporter.processTranslations
    ], (error, pipe) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      return res.json({success: !error, message: `Translations are imported successfully for commit: ${pipe.transaction.commit}`});
    });
  }

  function getConceptsAndEntities(pipe, onConceptsAndEntitiesFound) {
    return async.parallel({
      entities: done => entitiesRepositoryFactory.currentVersion(pipe.dataset, pipe.version).findEntityPropertiesByQuery({}, (error, entities) => {
        if (error) {
          return done(error);
        }
        return done(null, entities);
      }),
      concepts: done => conceptsRepositoryFactory.currentVersion(pipe.dataset, pipe.version).findConceptsByQuery({}, (error, concepts) => {
        if (error) {
          return done(error);
        }
        return done(null, concepts);
      })
    }, (error, result) => {
      if (error) {
        return onConceptsAndEntitiesFound(error);
      }

      return onConceptsAndEntitiesFound(null, _.extend(pipe, result));
    });
  }
};
