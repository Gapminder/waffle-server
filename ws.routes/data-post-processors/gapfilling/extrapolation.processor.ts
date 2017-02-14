import * as _ from "lodash";

export {
  extrapolate
};

function extrapolate(rows, measureValueColumnIndexes?, options?) {
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
    .groupBy(row => row[geoColumnIndex])
    .map((geoGroup) => {
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

  function createExtrapolationTasks(specificGeoRows) {
    return _.reduce(measureValueColumnIndexes, (tasks, measureValueColumn: string) => {
      const leftEnd = _.findIndex(specificGeoRows, nonEmpty(measureValueColumn));
      if (notFound(leftEnd)) {
        return tasks;
      }

      let rightStart = _.findLastIndex(specificGeoRows, nonEmpty(measureValueColumn));

      tasks[measureValueColumn] = {
        leftValue: specificGeoRows[leftEnd][measureValueColumn],
        leftStart: leftEnd - numOfYearsToExtrapolate,
        leftEnd: leftEnd,
        rightValue: specificGeoRows[rightStart][measureValueColumn],
        rightStart: rightStart,
        rightEnd: rightStart + numOfYearsToExtrapolate
      };

      return tasks;
    }, []);
  }

  function extrapolateMeasureValues(geoSpecificRowsContainer) {
    return _.map(geoSpecificRowsContainer.rows, (row: string, rowIndex) => {
      return _.map(row, (cell, measureValueColumn) => {
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

  function nonEmpty(column) {
    return cell => cell[column] !== null && cell[column] !== undefined;
  }

  function notFound(index) {
    return index === -1;
  }
}
