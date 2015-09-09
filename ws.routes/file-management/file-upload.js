var fs = require('fs');
var AWS = require('aws-sdk');
var cors = require('cors');
var uuid = require('node-uuid');
var multiparty = require('connect-multiparty')();

var mongoose = require('mongoose');
var Files = mongoose.model('Files');

var s3 = new AWS.S3({region: 'eu-west-1', params: {Bucket: 'digital-world'}});

var ensureAuthenticated = require('../utils').ensureAuthenticated;
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
  var logger = app.get('log');
  app.options('/api/files/uploads', cors(corsOptions));

  app.post('/api/files/uploads', cors(corsOptions), multiparty, ensureAuthenticated, function (req, res) {
    uploadPostProcessing(req.files.file, req.user);
    return res.json({answer: 'completed'});
  });

  function uploadPostProcessing(file, user) {
    process.nextTick(function postProcessing() {
      var fileExt = (file.name.match(/\..*$/) || [''])[0];
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
