import { constants } from '../ws.utils/constants';
import { logger } from '../ws.config/log';
import {DatasetsFileds, TelegrafService} from '../ws.services/telegraf.service';

export type TrackableType = 'datapoints' | 'entities' | 'concepts';
export interface DatasetState {
  datapoints: number;
  entities: number;
  concepts: number;
  translations: number;
}

/* tslint:disable: interface-name */
export interface IDatasetTracker {
  increment(dataType: TrackableType, value: number): void;
  getState(): DatasetState;
}
/* tslint:enable: interface-name */

const UNKNOWN_DATASET_TRACKER: IDatasetTracker = {
  increment(dataType: TrackableType, value: number): void {
    // nothing should be done here
  },
  getState(): DatasetState {
    return {
      datapoints: 0,
      entities: 0,
      concepts: 0,
      translations: 0
    };
  }
};

/* tslint:disable: member-ordering */
export class DatasetTracker implements IDatasetTracker {
  public static TYPE_IMPORT: string = 'import';
  public static TYPE_UPDATE: string = 'update';
  public static TYPE_ROLLBACK: string = 'rollback';
  public static TYPE_REMOVAL: string = 'removal';
  private static TRACKERS: Map<string, DatasetTracker> = new Map<string, DatasetTracker>();

  private conceptsAmount: number = 0;
  private entitiesAmount: number = 0;
  private datapointsAmount: number = 0;
  private translationsAmount: number = 0;
  private identifier: string;
  private type: string;

  private constructor(identifier: string, type: string) {
    this.identifier = identifier;
    this.type = type;
  }

  public increment(dataType: TrackableType, value: number): void {

    if (dataType === constants.CONCEPTS) {
      this.conceptsAmount += value;
    } else if (dataType === constants.ENTITIES) {
      this.entitiesAmount += value;
    } else if (dataType === constants.DATAPOINTS) {
      this.datapointsAmount += value;
    } else {
      this.translationsAmount +=value;
    }

    TelegrafService.onDatasetStateChanged({
      process: this.identifier,
      type: this.type,
      state: TelegrafService.STATE_PROCESS
    }, this.getState() as DatasetsFileds);
  }

  public getState(): DatasetState {
    return {
      concepts: this.conceptsAmount,
      entities: this.entitiesAmount,
      datapoints: this.datapointsAmount,
      translations: this.translationsAmount
    };
  }

  public static track(identifier: string, type: string = DatasetTracker.TYPE_IMPORT): IDatasetTracker {
    DatasetTracker.TRACKERS.set(identifier, new DatasetTracker(identifier, type));
    const tracker = DatasetTracker.get(identifier);

    TelegrafService.onDatasetStateChanged({
      process: identifier,
      type,
      state: TelegrafService.STATE_RUN
    }, tracker.getState() as DatasetsFileds);

    return tracker;
  }

  public static get(identifier: string): IDatasetTracker {
    if (!DatasetTracker.TRACKERS.has(identifier)) {
      return UNKNOWN_DATASET_TRACKER;
    }

    return DatasetTracker.TRACKERS.get(identifier);
  }

  public static has(identifier: string): boolean {
    return DatasetTracker.TRACKERS.has(identifier);
  }

  public static clean(identifier: string, type: string = DatasetTracker.TYPE_IMPORT): void {
    if (DatasetTracker.TRACKERS.has(identifier)) {
      logger.info(JSON.stringify(DatasetTracker.TRACKERS.get(identifier).getState()));
    }

    const tracker = DatasetTracker.get(identifier);

    TelegrafService.onDatasetStateChanged({
      process: identifier,
      type,
      state: TelegrafService.STATE_FINISH
    }, tracker.getState() as DatasetsFileds);

    DatasetTracker.TRACKERS.delete(identifier);
  }
}
/* tslint:enable: member-ordering */
