var fs = require('fs');
var multer = require('multer');
var AWS = require('aws-sdk');
var cors = require('cors');
var uuid = require('node-uuid');
var multiparty = require('connect-multiparty')();
var mongoose = require('mongoose');

var AwsS3Service = require('./aws-s3-service');
var Files = mongoose.model('Files');

var DIR = './uploads/';
var upload = multer({dest: DIR});

var s3 = new AWS.S3({region: 'eu-west-1', params: {Bucket: 'digital-world'}});

var awsS3Service = new AwsS3Service();

// put to config
// bucket name
// region
// url prefix https://digital-world.s3-eu-west-1.amazonaws.com/

var corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  }
};

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var config = app.get('config');
  var authLib = app.get('authLib');
  var ensureAuthenticated = config.BUILD_TYPE === 'angular2' ? authLib.getAuthMiddleware : require('../utils').ensureAuthenticated;

  app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
  });

  var logger = app.get('log');

  app.use(function (req, res, next) {
    var handler = multer({
      dest: DIR,
      rename: function (fieldname, filename) {
        return filename + Date.now();
      },
      onFileUploadComplete: function (file) {
        var fileName = file.originalname;
        var fileExt = (fileName.match(/\.[^\.]*$/) || [''])[0];
        var key = uuid.v4() + fileExt;
        var prefix = 'original/';

        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
        awsS3Service.put({
          Bucket: process.env.S3_BUCKET,
          Key: prefix + key,
          Body: fs.createReadStream(file.path),
          ACL: 'public-read',
          ContentType: file.mimetype
        }, function (err, s3Object) {
          console.log(err, s3Object);

          if (err) {
            console.log(err);
          }

          if (!err) {
            // todo: remove stub: implement real user
            var user = {
              username: 'foo',
              name: 'foo',
              email: 'foo@foo.foo'
            };

            Files.create({
              uri: s3Object.Location,
              name: file.originalname,
              ext: fileExt,
              owners: [user],
              type: file.mimetype,
              size: file.size,
              createdBy: user
            }, function (err2) {
              if (err2) {
                logger.error(err2);
              }

              fs.unlink(file.path, logger.log.bind(logger));
            });
          }
        });
      }
    });

    handler(req, res, next);
  });

  app.options('/api/files/uploads', cors(corsOptions));

  app.post('/api/files/uploads', cors(corsOptions), multiparty, ensureAuthenticated, function (req, res) {
    uploadPostProcessing(req.files.file, req.user);
    return res.json({answer: 'completed'});
  });

  app.post('/api/files/uploads-new', function (req, res) {
    upload(req, res, function (err) {
    });
    return res.json({answer: 'completed'});
  });

  function uploadPostProcessing(file, user) {
    process.nextTick(function postProcessing() {
      var fileExt = (file.name.match(/\.[^\.]*$/) || [''])[0];
      var key = uuid.v4() + fileExt;
      var prefix = 'original/';
      s3.upload({
        ACL: 'public-read',
        Bucket: 'digital-world',
        Key: prefix + key,
        Body: fs.createReadStream(file.path),
        CacheControl: 'max-age=86400',
        ContentDisposition: 'attachment; filename=' + file.name,
        ContentLength: file.size,
        ContentType: file.type,
        Metadata: {
          name: file.name,
          size: file.size.toString()
        }
      }, function (err, s3Object) {
        if (err) {
          return logger.error(err);
        }

        Files.create({
          uri: s3Object.Location,
          name: file.originalFilename || file.name,
          ext: fileExt,
          owners: [user],
          type: file.type,
          size: file.size,
          createdBy: user
        }, function (err2) {
          if (err2) {
            logger.error(err2);
          }

          fs.unlink(file.path, logger.log.bind(logger));
        });
      });
    });
  }
};
