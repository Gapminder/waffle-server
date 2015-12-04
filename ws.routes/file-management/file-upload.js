var fs = require('fs');
var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var multiparty = require('connect-multiparty')();

var mongoose = require('mongoose');
var Files = mongoose.model('Files');
var cors = require('./cors')(['POST']);

// put to config
// bucket name
// region
// url prefix https://digital-world.s3-eu-west-1.amazonaws.com/

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var buildTypeAwareAuth = require('./build-type-aware-auth')(serviceLocator);
  var ensureAuthenticated = buildTypeAwareAuth.ensureAuthenticated;
  var authUserSyncMiddleware = buildTypeAwareAuth.authUserSyncMiddleware;

  var config = app.get('config');
  var s3 = new AWS.S3({region: config.aws.REGION, params: {Bucket: config.aws.S3_BUCKET}});

  var logger = app.get('log');
  app.options('/api/files/uploads', cors);

  app.post('/api/files/uploads', cors, ensureAuthenticated, multiparty, authUserSyncMiddleware, function (req, res) {
    uploadPostProcessing(req.files.file, req.user);
    return res.json({answer: 'completed'});
  });

  function uploadPostProcessing(file, user) {
    var fileName = file.name || file.originalFilename || file.originalfilename;
    var fileType = file.type || file.mimetype;

    process.nextTick(function postProcessing() {
      var fileExt = (fileName.match(/\.[^\.]*$/) || [''])[0];
      var key = uuid.v4() + fileExt;
      var prefix = 'original/';
      s3.upload({
        ACL: 'public-read',
        Bucket: config.aws.S3_BUCKET,
        Key: prefix + key,
        Body: fs.createReadStream(file.path),
        CacheControl: 'max-age=86400',
        ContentDisposition: 'attachment; filename=' + fileName,
        ContentLength: file.size,
        ContentType: fileType,
        Metadata: {
          name: fileName,
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
          owners: [user._id],
          type: fileType,
          size: file.size,
          createdBy: user._id
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
