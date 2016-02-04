'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', () => {
  return runMochaOn(['!**/*integ.spec.js', '**/*.spec.js']);
});

gulp.task('test:integ', () => {
  return runMochaOn(['**/*integ.spec.js']);
});

function runMochaOn(path) {
  return gulp.src(['!node_modules/**'].concat(path), {read: false}).pipe(mocha());
}
