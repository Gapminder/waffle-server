'use strict';

var gulp = require('gulp');
var _ = require('lodash');
var config = require('../ws.config/environment.config.js');
var through2 = require('through2').obj;
var swaggerJSDoc = require('swagger-jsdoc');
var File = require('vinyl');

var HOST = config.HOST_URL.split('//').pop(-1);

gulp.task('swagger', () => {
  let filenames = [];

  //return gulp.src(['!node_modules/**', '**/*.controller.js'])
  return gulp.src(['!node_modules/**', '**/*.js'])
    .pipe(through2(function (file, enc, callback) {
      filenames.push(file.relative);
      callback();
    }, function (callback) {
      var options = {
        swaggerDefinition: {
          info: {
            title: 'Waffle server',
            version: '0.0.1'
          },
          host: HOST + ':' + config.PORT,
          schemes: [
            "http",
            "https"
          ],
          basePath: '/'
        },
        apis: filenames
      };

      let swaggerJson = new File({
        contents: new Buffer(JSON.stringify(swaggerJSDoc(options))),
        base: process.cwd(),
        path: process.cwd() + '/swagger.json'
      });

      this.push(swaggerJson);

      callback();
    }))
    .pipe(gulp.dest('.'))

});
