import * as _ from 'lodash';

export {
  extrapolate
};

function extrapolate(rows: any, measureValueColumnIndexes?: any, options?: any): any {
  options = options || {};
  const numOfYearsToExtrapolate = options.numOfYearsToExtrapolate || 1;
  const geoColumnIndex = _.isNumber(options.geoColumnIndex) ? options.geoColumnIndex : 0;
  const yearColumnIndex = _.isNumber(options.yearColumnIndex) ? options.yearColumnIndex : 1;

  if (!rows || !rows.length) {
    return [];
  }

  if (!measureValueColumnIndexes || !measureValueColumnIndexes.length) {
    return rows;
  }

  return _.chain(rows)
    .groupBy((row: any) => row[geoColumnIndex])
    .map((geoGroup: any) => {
      const geoSpecificRowsContainer: any = {};
      geoSpecificRowsContainer.rows = _.sortBy(geoGroup, yearColumnIndex);
      geoSpecificRowsContainer.tasks = createExtrapolationTasks(geoSpecificRowsContainer.rows);

      if (!geoSpecificRowsContainer.tasks.length) {
        return geoSpecificRowsContainer.rows;
      }
      return extrapolateMeasureValues(geoSpecificRowsContainer);
    })
    .flatten()
    .value();

  function createExtrapolationTasks(specificGeoRows: any): any {
    return _.reduce(measureValueColumnIndexes, (tasks: any, measureValueColumn: string) => {
      const leftEnd = _.findIndex(specificGeoRows, nonEmpty(measureValueColumn));
      if (notFound(leftEnd)) {
        return tasks;
      }

      let rightStart = _.findLastIndex(specificGeoRows, nonEmpty(measureValueColumn));

      tasks[measureValueColumn] = {
        leftValue: specificGeoRows[leftEnd][measureValueColumn],
        leftStart: leftEnd - numOfYearsToExtrapolate,
        leftEnd,
        rightValue: specificGeoRows[rightStart][measureValueColumn],
        rightStart,
        rightEnd: rightStart + numOfYearsToExtrapolate
      };

      return tasks;
    }, []);
  }

  function extrapolateMeasureValues(geoSpecificRowsContainer: any): any {
    return _.map(geoSpecificRowsContainer.rows, (row: string, rowIndex: any) => {
      return _.map(row, (cell: any, measureValueColumn: any): void => {
        const currentTask = geoSpecificRowsContainer.tasks[measureValueColumn];
        if (!currentTask) {
          return cell;
        }

        if (rowIndex >= currentTask.leftStart && rowIndex < currentTask.leftEnd) {
          return currentTask.leftValue;
        }

        if (rowIndex > currentTask.rightStart && rowIndex <= currentTask.rightEnd) {
          return currentTask.rightValue;
        }

        return cell;
      });
    });
  }

  function nonEmpty(column: any): any {
    return (cell: any) => cell[column] !== null && cell[column] !== undefined;
  }

  function notFound(index: any): boolean {
    return index === -1;
  }
}
