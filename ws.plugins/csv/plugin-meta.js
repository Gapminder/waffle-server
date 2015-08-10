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
  }
};
