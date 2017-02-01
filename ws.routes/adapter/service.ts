import * as cors from 'cors';
import * as express from 'express';
import * as compression from 'compression';

import * as routeUtils from '../utils';
import { cache } from '../../ws.utils/redis-cache';
import { constants } from '../../ws.utils/constants';

import { KeyValueRepository } from '../../ws.repository/ddf/key-value/key-value.repository';

import * as mcPrecomputedShapes from './fixtures/mc_precomputed_shapes.json';
import * as world50m from './fixtures/world-50m.json';
import * as enStrings from './fixtures/en.json';

function createAdapterServiceController(serviceLocator) {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.get('/api/vizabi/translation/:lang.json',
    cors(),
    compression(),
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_TRANSLATIONS),
    cache.route(),
    getTranslations
  );

  router.post('/api/vizabi/hack/translation/:lang.json',
    cors(),
    updateTranslations
  );

  router.get('/api/vizabi/mc_precomputed_shapes.json',
    cors(),
    compression(),
    routeUtils.getCacheConfig('mc-precomputed-shapes'),
    cache.route(),
    (req, res) => res.json(mcPrecomputedShapes)
  );

  router.get('/api/vizabi/world-50m.json',
    cors(),
    compression(),
    routeUtils.getCacheConfig('world-50m'),
    cache.route(),
    (req, res) => res.json(world50m)
  );

  return app.use(router);

  function getTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';
    return KeyValueRepository.get(lang, enStrings, (error, value) => res.json(value));
  }

  function updateTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';

    return KeyValueRepository.set(lang, req.body, error => {
      if (error) {
        return res.json({success: !error, error});
      }

      return cache.del(`${constants.DDF_REDIS_CACHE_NAME_TRANSLATIONS}*`, (cacheError, numEntriesDeleted) => {
        if (cacheError) {
          return res.json({success: !cacheError, error: cacheError});
        }

        return res.json(`Translations were updated and ${numEntriesDeleted} cache entries were deleted`);
      });
    });
  }
}

export { createAdapterServiceController };
