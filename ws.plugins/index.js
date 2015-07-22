'use strict';

/**
 * Register plugins
 * @param {ServiceLocatorContainer} serviceLocator - service locator
 * @returns {void} - nothing
 */
module.exports = function (serviceLocator, cb) {
  /** @type DataSourceTypesRepository */
  var dataSourceTypesRepository = serviceLocator.repositories.get('data-source-types');

  // todo: can be generic
  registerPlugin(require('./google-spread-sheets')(serviceLocator), cb);

  function registerPlugin(plugin, registerCb) {
    serviceLocator.plugins.set(plugin.meta.name, plugin);
    dataSourceTypesRepository.add(plugin.meta, registerCb);
  }
};
