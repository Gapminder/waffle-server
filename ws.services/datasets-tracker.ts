import { constants } from '../ws.utils/constants';

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
  private static TRACKERS: Map<string, DatasetTracker> = new Map<string, DatasetTracker>();

  private conceptsAmount: number = 0;
  private entitiesAmount: number = 0;
  private datapointsAmount: number = 0;
  private translationsAmount: number = 0;

  private constructor() {
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
  }

  public getState(): DatasetState {
    return {
      concepts: this.conceptsAmount,
      entities: this.entitiesAmount,
      datapoints: this.datapointsAmount,
      translations: this.translationsAmount
    };
  }

  public static track(identifier: string): IDatasetTracker {
    DatasetTracker.TRACKERS.set(identifier, new DatasetTracker());
    return DatasetTracker.get(identifier);
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

  public static clean(identifier: string): void {
    DatasetTracker.TRACKERS.delete(identifier);
  }
}
/* tslint:enable: member-ordering */
