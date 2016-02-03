'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', () => {
  return gulp.src(['!node_modules/**','**/*.spec.js'], {read: false}).pipe(mocha());
});
