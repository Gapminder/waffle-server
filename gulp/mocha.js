'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', () => {
  return runMochaOn(['!**/*e2e.spec.js', '**/*.spec.js']);
});

gulp.task('test:e2e', () => {
  return runMochaOn(['**/*e2e.spec.js']);
});

function runMochaOn(path) {
  return gulp.src(['!node_modules/**'].concat(path), {read: false}).pipe(mocha());
}
