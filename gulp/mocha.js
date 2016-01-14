'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', () => {
  return gulp.src('**/*.spec.js', {read: false}).pipe(mocha());
});
