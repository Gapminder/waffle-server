import * as cron from 'cron';
import { DbService, Operation } from '../ws.services/db.service';
import { logger } from '../ws.config/log';

export interface CronJob {
  stop: () => void;
  start: () => void;
  running: boolean;
}

const EVERY_30_SECONDS = `*/30 * * * * *`;

export const createLongRunningQueriesKiller = (dbService: DbService): CronJob => {
  return new cron.CronJob(EVERY_30_SECONDS, () => {
    const marker = Date.now();
    logger.info(`[${marker}] Starting check for long running queries`);
    dbService.killLongRunningQueries().then((killed: Operation[]) => {
        logger.info(`[${marker}] Queries found for being killed (if any): `, killed);
    });
  });
};
