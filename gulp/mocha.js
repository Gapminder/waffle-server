'use strict';

const NODE_ENV = process.env.NODE_ENV || 'test';
const gulp = require('gulp');
const mocha = require('gulp-spawn-mocha');

gulp.task('test', () => {
  return runMochaOn(['test/**/*.test.js']);
});

gulp.task('test:e2e', () => {
  return runMochaOn(['**/*.e2e.js']);
});

function runMochaOn(path) {
  return gulp.src(['!node_modules/**'].concat(path), {read: false}).pipe(mocha({
    env: {'NODE_ENV': NODE_ENV}
  }));
}
