import { prompt } from 'inquirer';
import { writeFileSync } from 'fs';
import { includes } from 'lodash';
import { getTestObjectGroups } from './definitions/test-object-groups';
import { testObjectsClasses } from './test-objects';
import { AbstractTestObject } from 'bb-tests-provider';

const testObjectOptions = testObjectsClasses.map((testObjectsClass: any) => ({name: new testObjectsClass().getTitle()}));

prompt([{
  type: 'checkbox',
  message: 'Select test object',
  name: 'testObjects',
  pageSize: 25,
  choices: testObjectOptions,
  validate: (answer: any) => {
    if (answer.length < 1) {
      return 'You must choose at least one topping.';
    }
    return true;
  }
}]).then((answers: any) => {
  const testObjectGroupsOptions = getTestObjectGroups()
    .filter((testObject: any) => includes(answers.testObjects, testObject.getTitle()))
    .map((testObject: any) => ({
      name: `${testObject.getTitle()} on ${testObject.dataSuite.title}`,
      value: {
        testObjectTitle: testObject.getTitle(),
        dataSuiteTitle: testObject.dataSuite.title
      },
      checked: true
    }));

  prompt([{
    type: 'checkbox',
    message: 'Select test object groups',
    name: 'testObjectsGroups',
    pageSize: 25,
    choices: testObjectGroupsOptions,
    validate: (answer: any) => {
      if (answer.length < 1) {
        return 'You must choose at least one topping.';
      }
      return true;
    }
  }]).then((finalAnswers: any) => {
    writeFileSync('test-bb-options.tmp', JSON.stringify(finalAnswers, null, 2));
  });
});
