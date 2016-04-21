'use strict';

let _ = require('lodash');
let arr = [
  {gid: 'test', title: 'dsfs', properties: {landlocked: 'coastline', region: 'asia'}},
  {gid: 'test12', title: 'fszd', properties: {landlocked: 'landlocked', region: 'europe'}},
];

let result = _.flatMap(arr, test);

console.log(result);

function test(item) {
  let groups = ['landlocked', 'region'];

  return _.map(groups, (entityGroupGid) => {
    return {
      entityGroupGid: entityGroupGid,
      childEntityGid: item.gid,
      parentEntityGid: item.properties[entityGroupGid]
    }
  });
}
