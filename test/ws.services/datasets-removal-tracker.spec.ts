import { DatasetRemovalTracker, RemovalState, IDatasetRemovalTracker } from '../../ws.services/datasets-removal-tracker';
import { constants } from '../../ws.utils/constants';
import { expect } from 'chai';

describe('DatasetRemovalTracker', () => {
  it('should track dataset removal progress', () => {
    const datasetIdentifier = 'Bla42';

    DatasetRemovalTracker.track(datasetIdentifier);

    const tracker: IDatasetRemovalTracker = DatasetRemovalTracker.get(datasetIdentifier);

    tracker.increment(constants.DATAPOINTS, 98);
    tracker.increment(constants.ENTITIES, 23);
    tracker.increment(constants.CONCEPTS, 123);

    const state: RemovalState = {
      concepts: 123,
      datapoints: 98,
      entities: 23
    };

    expect(tracker.getState()).to.deep.equal(state);

    DatasetRemovalTracker.clean(datasetIdentifier);
  });

  it('should remove dataset from tracking and return only stub tracker of unrecognized dataset identifier', () => {
    const datasetIdentifier = 'Bla42';

    DatasetRemovalTracker.track(datasetIdentifier);

    let tracker: IDatasetRemovalTracker = DatasetRemovalTracker.get(datasetIdentifier);
    expect(tracker).to.exist;

    DatasetRemovalTracker.clean(datasetIdentifier);

    tracker = DatasetRemovalTracker.get(datasetIdentifier);
    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      entities: 0,
      datapoints: 0
    });

    expect(DatasetRemovalTracker.has(datasetIdentifier)).to.be.false;
  });

  it('should return stub tracker for not existing dataset', () => {
    const tracker: IDatasetRemovalTracker = DatasetRemovalTracker.get('datasetIdentifier');

    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      entities: 0,
      datapoints: 0
    });

    tracker.increment(constants.CONCEPTS, 1);
    tracker.increment(constants.ENTITIES, 2);
    tracker.increment(constants.DATAPOINTS, 3);

    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      entities: 0,
      datapoints: 0
    });
  });

  it('should clean silently not existing dataset', () => {
    DatasetRemovalTracker.clean('datasetIdentifier');
  });

  it('should have initial state', () => {
    const datasetIdentifier = 'Bla42';
    DatasetRemovalTracker.track(datasetIdentifier);
    const tracker: IDatasetRemovalTracker = DatasetRemovalTracker.get(datasetIdentifier);

    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      datapoints: 0,
      entities: 0
    });
  });
});
