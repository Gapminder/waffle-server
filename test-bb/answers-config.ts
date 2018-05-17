import { readFileSync } from 'fs';

let _testsOptions = null;

if (!_testsOptions) {
  try {
    const content = readFileSync('test-bb-options.tmp', 'utf-8');

    _testsOptions = JSON.parse(content);
  } catch (e) {
    _testsOptions = [];
  }
}

export const testsOptions = _testsOptions.testObjectsGroups;
