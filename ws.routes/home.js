'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');

// frontend routes =========================================================
// route to handle all angular requests
router.get('*', function(req, res) {
  // load our public/index.html file
  res.sendFile('index.html', {root: path.join(__dirname, '../ws.public')});
});

module.exports = router;
