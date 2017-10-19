import {config as applicationConfig} from './ws.config/config';
/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
const config = {
  /**
   * Array of application names.
   */
  app_name: [`Waffle Server ${applicationConfig.NODE_ENV}`],
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: applicationConfig.IS_PRODUCTION ? 'info' : 'trace'
  }
};

export {
  config
};
