'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', () => {
  return runMochaOn(['ws*/**/*.test.js']);
});

gulp.task('test:e2e', () => {
  return runMochaOn(['**/*.e2e.js']);
});

function runMochaOn(path) {
  return gulp.src(['!node_modules/**'].concat(path), {read: false}).pipe(mocha());
}
