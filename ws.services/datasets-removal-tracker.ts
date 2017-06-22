import { constants } from '../ws.utils/constants';

export type TrackableType = 'datapoints' | 'entities' | 'concepts';
export interface RemovalState {
  datapoints: number;
  entities: number;
  concepts: number;
}

/* tslint:disable: interface-name */
export interface IDatasetRemovalTracker {
  increment(dataType: TrackableType, value: number): void;
  getState(): RemovalState;
}
/* tslint:enable: interface-name */

const UNKNOWN_DATASET_REMOVAL_TRACKER: IDatasetRemovalTracker = {
  increment(dataType: TrackableType, value: number): void {
    // nothing should be done here
  },
  getState(): RemovalState {
    return {
      datapoints: 0,
      entities: 0,
      concepts: 0
    };
  }
};

/* tslint:disable: member-ordering */
export class DatasetRemovalTracker implements IDatasetRemovalTracker {
  private static TRACKERS: Map<string, DatasetRemovalTracker> = new Map<string, DatasetRemovalTracker>();

  private removedConceptsAmount: number = 0;
  private removedEntitiesAmount: number = 0;
  private removedDatapointsAmount: number = 0;

  private constructor() {
  }

  public increment(dataType: TrackableType, value: number): void {
    if (dataType === constants.CONCEPTS) {
      this.removedConceptsAmount += value;
    } else if (dataType === constants.ENTITIES) {
      this.removedEntitiesAmount += value;
    } else {
      this.removedDatapointsAmount += value;
    }
  }

  public getState(): RemovalState {
    return {
      concepts: this.removedConceptsAmount,
      entities: this.removedEntitiesAmount,
      datapoints: this.removedDatapointsAmount
    };
  }

  public static track(identifier: string): IDatasetRemovalTracker {
    DatasetRemovalTracker.TRACKERS.set(identifier, new DatasetRemovalTracker());
    return DatasetRemovalTracker.get(identifier);
  }

  public static get(identifier: string): IDatasetRemovalTracker {
    if (!DatasetRemovalTracker.TRACKERS.has(identifier)) {
      return UNKNOWN_DATASET_REMOVAL_TRACKER;
    }

    return DatasetRemovalTracker.TRACKERS.get(identifier);
  }

  public static has(identifier: string): boolean {
    return DatasetRemovalTracker.TRACKERS.has(identifier);
  }

  public static clean(identifier: string): void {
    DatasetRemovalTracker.TRACKERS.delete(identifier);
  }
}
/* tslint:enable: member-ordering */
