'use strict';

var gulp = require('gulp');

gulp.paths = {
  src: ['**/*.js', '!node_modules/**/*', '!ws.web/public/js/libs/**/*']
};

require('require-dir')('./gulp');

gulp.task('default', function () {
  gulp.start('lint');
});
