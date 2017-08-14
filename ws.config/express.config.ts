import * as logger from 'morgan';
import * as passport from 'passport';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as methodOverride from 'method-override';

import * as session from 'express-session';
import * as connectRedis from 'connect-redis';

const RedisStore = connectRedis(session);

const REQUEST_BODY_SIZE_LIMIT = '50mb';

export function configureExpress(app: express.Application): void {
  app.use(logger('dev'));
  app.use(bodyParser.json({ limit: REQUEST_BODY_SIZE_LIMIT }));
  app.use(bodyParser.urlencoded({ limit: REQUEST_BODY_SIZE_LIMIT, extended: true }));
  app.use(methodOverride('X-HTTP-Method-Override'));
  app.use(cookieParser());
  app.use(session({
    secret: 'keyboard cat',
    proxy: true,
    store: new RedisStore(),
    resave: true,
    saveUninitialized: true
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.set('passport', passport);
}
