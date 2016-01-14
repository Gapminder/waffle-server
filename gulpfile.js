var gulp = require('gulp');

gulp.paths = {
  src: ['**/*.js', '!node_modules/**/*', '!ws.public/libs/**/*']
};

require('require-dir')('./gulp');

gulp.task('default', function () {
  gulp.start('lint');
});
