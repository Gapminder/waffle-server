'use strict';

module.exports = function (serviceLocator) {
  // data analysis
  // where (worksheet:Data, row:1, exclude column:1) what (dimension:year(type: Number))
  // where (worksheet:Data, column:1,exclude row:1) what (dimension:country(type: Number))
  // where (worksheet:Data) what (indicator:life_expectancy_at_birth)

  // steps
  // create dimensions if not exists
  // create indicators
  // create indicator values
};
