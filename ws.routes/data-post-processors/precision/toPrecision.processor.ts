import * as _ from 'lodash';

function toPrecision(matrix, columns?, precisionLevel?) {
  let precision: number = parseInt(precisionLevel, 10);

  if (!matrix || !matrix.length || _.isNaN(precision)) {
    return matrix;
  }

  precision = precision < 0 ? 0 : precision;
  precision = precision > 15 ? 15 : precision;

  const columnsToProcess = columns || _.range(matrix[0].length);

  return _.map(matrix, (row: any[]) => {
    return _.map(row, (cell: string, column: string) => {
      if (_.isNumber(cell) && _.includes(columnsToProcess, column)) {
        return parseFloat(cell.toFixed(precision));
      }
      return cell;
    });
  });
}


export {
  toPrecision
};
