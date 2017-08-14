import { Connection } from 'mongoose';
import { Db } from 'mongodb';
import { logger } from '../ws.config/log';
import * as _ from 'lodash';
import { constants } from '../ws.utils/constants';

type MongoOperationType = 'none' | 'update' | 'insert' | 'query' | 'getmore' | 'remove' | 'killcursors' | 'command';

const longRunningOperationTypes = new Set<MongoOperationType>(['query', 'command']);
const applicableCollectionsPattern = /\.datapoints$/;
const propertiesToPickFromKilledOperations = ['ns', 'planSummary', 'query', 'secs_running'];

export interface Operation {
  active: boolean;
  opid: number;
  secs_running: number;
  op: MongoOperationType;
  ns: string;
  planSummary?: any;
  query?: any;
}

export class DbService {
  private db: Db;

  public constructor(connection: Connection) {
    this.db = connection.db;
  }

  public killLongRunningQueries(properties: string[] = propertiesToPickFromKilledOperations): Promise<any[]> {
    return this.longRunningQueries()
      .then((victims: Operation[]) => this.killOperations(victims))
      .then((killed: Operation[]) => _.map(killed, (victim: Operation) => _.pick(victim, properties)));
  }

  private longRunningQueries(): Promise<Operation[]> {
    return this.currentOperations().then((operations: Operation[]) => {
      return operations.filter((operation: Operation) => {
        return longRunningOperationTypes.has(operation.op)
          && applicableCollectionsPattern.test(operation.ns)
          && operation.secs_running > constants.LONG_RUNNING_QUERY_THRESHOLD_IN_SECONDS;
      });
    });
  }

  private currentOperations(): Promise<Operation[]> {
    return this.db.executeDbAdminCommand({ currentOp: 1 })
      .then((result: any) => result.inprog as Operation[])
      .catch((error: any) => {
        logger.error(`Failed getting current ops: ${error}`);
        return [];
      });
  }

  private killOperations(operations: Operation[]): Promise<Operation[]> {
    const executors = operations.map((operation: Operation) => this.db.executeDbAdminCommand({
      killOp: 1,
      op: operation.opid
    }));
    return Promise.all(executors)
      .then(() => operations)
      .catch((error: any) => {
        logger.error(`Failed to kill ops because of: ${error}. Operations: `, operations);
        return [];
      });
  }
}
