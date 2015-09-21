var _ = require('lodash');
// helper declarations
function TableQuery(table) {
  this.table = table;
}

TableQuery.prototype.select = function chainableGetRow(selector) {
  this.row = getRow(this.table, selector);
  return this;
};

TableQuery.prototype.filter = function chainableFilterRow(selector) {
  this.row = filterRow(this.row, selector);
  return this;
};

/**
 * @param {{selector, dimension, hashMap}}dimensions
 */
TableQuery.prototype.map = function map(dimensions) {
  /** @typeof Table */
  var table = {
    name: 'recognized ' + this.table.name,
    dimensions: dimensions,
    headers: {
      col: this.table.headers.col.slice()
    },
    rows: _.map(this.table.rows, function (row) {
      return row.slice();
    })
  };
  _.each(dimensions, function (dimension) {
    if (dimension.where === 'header') {
      table.headers.col = replaceByHashMap(table.headers.col, dimension);
      return;
    }
    if (dimension.where === 'row') {
      table.headers.col[dimension.index] = dimension.dimension.name;
      var index = parseInt(dimension.index, 10);
      _.each(table.rows, function (row) {
        row[index] = dimension.hashMap[row[index]];
      });
      return;
    }
  });
  return table;
};

function replaceByHashMap(row, selector) {
  var skips = parseSkip(selector.skip) || [];
  return _.map(row, function (val, index) {
    if (skips.indexOf(index) !== -1) {
      return val;
    }
    return selector.hashMap[val];
  });
}

TableQuery.prototype.value = function () {
  return this.row;
};

/**
 * Query chainer
 * @param {Table} table
 * @param {} selector
 * @returns {TableQuery} - chainable instance if Query
 */
TableQuery.chain = function createChain(table, selector) {
  return new TableQuery(table, selector);
};

function parseSkip(skip) {
  if (!skip || typeof skip !== 'string') {
    return null;
  }

  return _.map(skip.split(','), function (val) {
    return parseInt(val, 10);
  });
}

function getRow(table, selector) {
  if (selector.where === 'header') {
    return table.headers.col;
  }
  if (selector.where === 'row') {
    var index = parseInt(selector.index, 10);
    return _.map(table.rows, function (row) {
      return row[index];
    });
  }
}

function filterRow(row, selector) {
  var skips = parseSkip(selector.skip);
  if (!skips) {
    return row;
  }
  var res = new Array(row.length - skips.length);

  var index = 0;
  for (var i = 0; i < row.length; i++) {
    if (skips.indexOf(i) !== -1) {
      continue;
    }

    res[index++] = row[i];
  }

  return row;
}

module.exports = TableQuery;
