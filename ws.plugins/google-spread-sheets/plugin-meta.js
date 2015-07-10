'use strict';

/**
 * Plugin metadata
 * @property {String} name - unique plugin name
 * @property {String} title - display name of plugin
 * @property {Object} dimensions - an object containing list of dimensions
 */
module.exports = {
  name: 'google-spread-sheets',
  title: 'Google Spread Sheets',
  dimensions: {
    worksheet: 'gs-worksheet',
    row: 'gs-row',
    column: 'gs-column'
  }
};
