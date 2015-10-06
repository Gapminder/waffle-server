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
    dimension.rowHashMap = {};
    if (dimension.where === 'header') {
      var skips = parseSkip(dimension.skip) || [];
      table.headers.col = _.map(table.headers.col, function (val, index) {
        if (skips.indexOf(index) !== -1) {
          return val;
        }

        dimension.rowHashMap[index] = dimension.hashMap[val];
        return dimension.hashMap[val];
      });
      return;
    }
    if (dimension.where === 'row') {
      table.headers.col[dimension.index] = dimension.dimension.title;
      var index = parseInt(dimension.index, 10);
      _.each(table.rows, function (row, offset) {
        dimension.rowHashMap[offset] = row[index] = dimension.hashMap[row[index]];
      });
      return;
    }
  });
  return table;
};

TableQuery.isTableCanNotBeConvertedToTidyData = function tableCanBeConvertedToTidyData(table) {
  if (!table) {
    return {error: 'Table please'};
  }

  if (!table.dimensions) {
    return {error: 'You should recognize dimensions first'};
  }

  if (table.dimensions.length !== 2) {
    return {error: 'Table have to contain 2 dimensions'};
  }

  // if both dimension are rows, it is already tidy
  if (table.dimensions[0].where === 'row' && table.dimensions[1].where === 'row') {
    return {error: 'Table already tidy'};
  }

  // if both dimension are rows, it is already tidy
  if (table.dimensions[0].where === 'col' && table.dimensions[1].where === 'col') {
    return {error: 'Two dimensions in one column header, really?'};
  }

  return false;
};

TableQuery.prototype.convertToTidyData = function convertToTidyData() {
  if (TableQuery.isTableCanNotBeConvertedToTidyData(this.table)) {
    return false;
  }

  var resLength = this.table.rows.length * (this.table.headers.col.length - 1);
  var d1 = this.table.dimensions[1];
  var d2 = this.table.dimensions[0];
  var headers = [d1.dimension.title, d2.dimension.title, 'value'];
  var res = new Array(resLength);
  for (var r = 0; r < this.table.rows.length; r++) {
    var row = this.table.rows[r];
    for (var c = 1; c < this.table.headers.col.length; c++) {
      res[(r + 1) * c - 1] = [d1.rowHashMap[r], d2.rowHashMap[c], row[c]];
    }
  }
  return {
    type: 'table',
    name: 'tidy data',
    rows: res,
    headers: {col: headers}
  };
};

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

  return res;
}

module.exports = TableQuery;
