'use strict';

const NODE_ENV = process.env.NODE_ENV || 'test';
const gulp = require('gulp');
const mocha = require('gulp-spawn-mocha');

gulp.task('test', () => {
  return runMochaOn(['test/**/*.test.js']);
});

gulp.task('e2e', () => {
  return runMochaOn(['test/**/*.e2e.js'], {timeout: 200000});
});

function runMochaOn(path, options) {
  return gulp.src(['!node_modules/**'].concat(path), {read: false}).pipe(mocha(options));
}
