import './passport';
import './db.config';

import { configureExpress } from './express.config';

function configureWaffleServer(app) {
  configureExpress(app);
}

export {
  configureWaffleServer
};
