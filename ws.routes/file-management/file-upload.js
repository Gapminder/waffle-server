var fs = require('fs');
var AWS = require('aws-sdk');
var cors = require('cors');
var uuid = require('node-uuid');
var multiparty = require('connect-multiparty')();

var mongoose = require('mongoose');
var Files = mongoose.model('Files');

var s3 = new AWS.S3({region: 'eu-west-1', params: {Bucket: 'digital-world'}});

var awsS3Service = new AwsS3Service();

// put to config
// bucket name
// region
// url prefix https://digital-world.s3-eu-west-1.amazonaws.com/

var corsOptions = {
  origin: true,
  methods: ['POST'],
  allowedHeaders: ['X-Requested-With', 'Content-Type'],
  credentials: true
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
  app.options('/api/files/uploads', cors(corsOptions));

  // todo: return it: ensureAuthenticated
  app.post('/api/files/uploads', cors(corsOptions), multiparty, function (req, res) {
    uploadPostProcessing(req.files.file, req.user);
    return res.json({answer: 'completed'});
  });

  function uploadPostProcessing(file, user) {
    var fileName = file.name || file.originalFilename || file.originalfilename;
    var fileType = file.type || file.mimetype;

    process.nextTick(function postProcessing() {
      var fileExt = (file.name.match(/\.[^\.]*$/) || [''])[0];
      var key = uuid.v4() + fileExt;
      var prefix = 'original/';
      s3.upload({
        ACL: 'public-read',
        Bucket: process.env.S3_BUCKET,
        Key: prefix + key,
        Body: fs.createReadStream(file.path),
        CacheControl: 'max-age=86400',
        ContentDisposition: 'attachment; filename=' + fileName,
        ContentLength: file.size,
        ContentType: fileType,
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
          name: fileName,
          ext: fileExt,
          owners: [user],
          type: fileType,
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
