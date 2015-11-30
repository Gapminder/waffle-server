var AWS = require('aws-sdk');

function UploaderService() {

  console.log();

  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'eu-west-1'
  });

  this._s3 = new AWS.S3();
}

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
UploaderService.prototype.put = function (params, cb) {

  console.log('---------------------------------------------');
  console.log(params);
  console.log('---------------------------------------------');

  this._s3.putObject(params, cb);
};

/*UploaderService.prototype.get = function (name, cb) {
  var params = {
    Bucket: this._config.bucket,
    Key: name
  };

  this._s3.getObject(params, cb);
};

UploaderService.prototype.delete = function (name, cb) {
  console.log('delete photo: ', name);
  var putParams = {
    Bucket: this._config.bucket,
    Key: name
  };

  this._s3.deleteObject(putParams, cb);
};

UploaderService.prototype.deleteList = function (list, cb) {
  var params = {
    Bucket: this._config.bucket,
    Delete: {
      Objects: list
    }
  };

  this._s3.deleteObjects(params, cb);
};*/

module.exports = UploaderService;
