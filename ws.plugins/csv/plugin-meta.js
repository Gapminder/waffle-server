'use strict';

/**
 * Plugin metadata
 * @property {String} name - unique plugin name
 * @property {String} title - display name of plugin
 * @property {Object} dimensions - an object containing list of dimensions
 */
module.exports = {
  name: 'csv',
  title: 'Csv',
  dimensions: {
    filename: 'csv-filename',
    row: 'csv-row',
    column: 'csv-column'
  },
  dimensionTypes: {
    country: {
      name: 'countries',
      title: 'Countries'
    },
    year: {
      name: 'year',
      title: 'Year'
    },
    region: {
      name: 'regions',
      title: 'Regions'
    },
    planet: {
      name: 'planet',
      title: 'World'
    }
  }
};
