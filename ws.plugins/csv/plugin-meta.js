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
    },
    time: {
      name: 'year',
      title: 'Year'
    },
    name: {
      name: 'companies',
      title: 'Companies'
    },
    category: {
      name: 'categories',
      title: 'Categories'
    },
    age: {
      name: 'age',
      title: 'Age'
    },
    'age.group': {
      name: 'age.group',
      title: 'Age group'
    },
    'geo.category': {
      name: 'geo.category',
      title: 'Geo category'
    }
  }
};
