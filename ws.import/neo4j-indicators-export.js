'use strict';
var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');

var app = express();
require('../ws.config')(app);

var serviceLocator = require('../ws.service-locator')(app);
require('../ws.repository')(serviceLocator);

var neo4jdb = app.get('neo4jDb');




