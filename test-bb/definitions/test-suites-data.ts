import { conceptsTestSuitesComplete } from '../concepts.spec';
import { entitiesTestSuitesComplete } from '../entities.spec';
import { datapointsTestSuitesComplete } from '../datapoints.spec';
import { conceptsAgTestSuitesCompletes } from '../ag-concepts.spec';
import { entitiesAgTestSuitesCompletes } from '../ag-entities.spec';
import {
  schemaConceptsTestSuitesComplete,
  schemaEntitiesTestSuitesComplete,
  schemaDatapointsTestSuitesComplete,
  schemaGeneralTestSuitesComplete
} from '../schema.spec';

export const testSuitesData = [
  conceptsTestSuitesComplete,
  entitiesTestSuitesComplete,
  datapointsTestSuitesComplete,
  schemaConceptsTestSuitesComplete,
  schemaEntitiesTestSuitesComplete,
  schemaDatapointsTestSuitesComplete,
  schemaGeneralTestSuitesComplete,
  ...conceptsAgTestSuitesCompletes,
  ...entitiesAgTestSuitesCompletes
];
