'use strict';

const gulp = require('gulp');
const mocha = require('gulp-spawn-mocha');

gulp.task('spec', () => {
  return runMochaOn(['dist/test/**/*.spec.js']);
});

gulp.task('e2e', () => {
  return runMochaOn(['dist/test/**/*.e2e.js'], {timeout: 200000});
});

function runMochaOn(path, options) {
  return gulp.src(['!node_modules/**'].concat(path), {read: false}).pipe(mocha(options));
}
