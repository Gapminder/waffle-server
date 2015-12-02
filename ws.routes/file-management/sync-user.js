var mongoose = require('mongoose');
var _ = require('lodash');

var Users = mongoose.model('Users');

module.exports = function authUserSyncMiddleware(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).send('User is not found!');
  }

  Users.find({'social.googleId': req.user._id}, function (err, users) {
    if (err) {
      return res.status(500).send(err);
    }

    if (users.length > 1) {
      return res.status(401).send('Too many users!');
    }

    if (users.length <= 0) {
      var user = new Users({
        name: req.user.name,
        email: req.user.email,
        // todo: resolve it when it will be needed
        password: '123',
        username: req.user.nickname || req.user.name || req.user.email,
        image: req.user.picture,
        social: {
          googleId: req.user._id
        }
      });

      return user.save(function (_err, _user) {
        if (_err) {
          return res.status(500).send(_err);
        }

        req.user._id = _user._id;
        return next();
      });
    }

    req.user._id = users[0]._id;
    return next();
  });
};
