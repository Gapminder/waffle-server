var fs = require('fs');
var AWS = require('aws-sdk');
var cors = require('cors');
var uuid = require('node-uuid');
var multiparty = require('connect-multiparty')();

var s3 = new AWS.S3({ region: 'eu-west-1', params: {Bucket: 'digital-world'} });

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

  app.post('/api/files/uploads', cors(corsOptions), multiparty, function (req, res) {
    // image -> create thumbnail
    // zip -> unzip
    // tar.gz -> ungzip
    var file = req.files.file;
    var fileExt = (file.name.match(/\..*$/) || '');
    var key = uuid.v4() + fileExt;
    var prefix = 'original/';
    s3.upload({
      ACL: 'public-read',
      Bucket: 'digital-world',
      Key: prefix + key,
      Body: fs.createReadStream(file.path),
      CacheControl: 'max-age=86400',
      ContentLength: file.size,
      ContentType: file.type,
      Metadata: {
        name: file.name,
        size: file.size.toString()
      }
    }, function(err, data) {
      // create
      if (data) {
        var user = {name: 'me :)'};
        var fileMeta = {
          uri: data.Location,
          name: file.originalFilename || file.name,
          ext: fileExt,
          owner: {$push: user},
          type: file.type,
          size: file.size
        };
        console.log(fileMeta);
        // todo: save to DB
      }
      fs.unlink(file.path, logger.log.bind(logger));
      return res.json({answer: 'completed', err: err, data: data});
    });
  });
};
