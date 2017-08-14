import { DatasetTracker, DatasetState, IDatasetTracker } from '../../ws.services/datasets-tracker';
import { constants } from '../../ws.utils/constants';
import { expect } from 'chai';

describe('DatasetTracker', () => {
  it('should track dataset progress', () => {
    const datasetIdentifier = 'Bla42';

    DatasetTracker.track(datasetIdentifier);

    const tracker: IDatasetTracker = DatasetTracker.get(datasetIdentifier);

    tracker.increment(constants.DATAPOINTS, 98);
    tracker.increment(constants.ENTITIES, 23);
    tracker.increment(constants.CONCEPTS, 123);
    tracker.increment(constants.TRANSLATIONS, 11);

    const state: DatasetState = {
      concepts: 123,
      datapoints: 98,
      entities: 23,
      translations: 11
    };

    expect(tracker.getState()).to.deep.equal(state);

    DatasetTracker.clean(datasetIdentifier);
  });

  it('should clean dataset from tracking and return only stub tracker of unrecognized dataset identifier', () => {
    const datasetIdentifier = 'Bla42';

    DatasetTracker.track(datasetIdentifier);

    let tracker: IDatasetTracker = DatasetTracker.get(datasetIdentifier);
    expect(tracker).to.exist;

    DatasetTracker.clean(datasetIdentifier);

    tracker = DatasetTracker.get(datasetIdentifier);
    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      entities: 0,
      datapoints: 0,
      translations: 0
    });

    expect(DatasetTracker.has(datasetIdentifier)).to.be.false;
  });

  it('should return stub tracker for not existing dataset', () => {
    const tracker: IDatasetTracker = DatasetTracker.get('datasetIdentifier');

    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      entities: 0,
      datapoints: 0,
      translations: 0
    });

    tracker.increment(constants.CONCEPTS, 1);
    tracker.increment(constants.ENTITIES, 2);
    tracker.increment(constants.DATAPOINTS, 3);
    tracker.increment(constants.TRANSLATIONS, 4);

    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      entities: 0,
      datapoints: 0,
      translations: 0
    });
  });

  it('should clean silently not existing dataset', () => {
    DatasetTracker.clean('datasetIdentifier');
  });

  it('should have initial state', () => {
    const datasetIdentifier = 'Bla42';
    DatasetTracker.track(datasetIdentifier);
    const tracker: IDatasetTracker = DatasetTracker.get(datasetIdentifier);

    expect(tracker.getState()).to.deep.equal({
      concepts: 0,
      datapoints: 0,
      entities: 0,
      translations: 0
    });
  });
});
