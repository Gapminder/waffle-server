var mongoose = require('mongoose');
var _ = require('lodash');

var Users = mongoose.model('Users');

module.exports = function authUserSyncMiddleware(req, res, next) {
  if (!req.user || !req.user._id) {
    res.status(401).send('User is not found!');
  }

  Users.find({'social.googleId': req.user._id}, function (err, users) {
    if (err) {
      res.status(500).send(err);
    }

    if (users.length <= 0) {
      var user = new Users({
        name: req.user.name,
        email: req.user.email,
        // todo: resolve it when it will be needed
        password: '123',
        username: req.user.nickname,
        image: req.user.picture,
        social: {
          googleId: req.user._id
        }
      });

      return user.save(function (err, user) {
        if (err) {
          res.status(500).send(err);
        }

        req.user._id = user._id.toString();
        next();
      });
    }

    next();
  });
};
