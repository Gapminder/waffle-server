import { run as runDeploy } from './autodeploy';
import { run as runUnpublish } from './autoremove';

(async function (): Promise<void> {
  let error;

  console.log('!!!!!!!!!!!!', process.env.GCP_STACK_ACTION);

  error = await runDeploy();

  // if (process.env.GCP_STACK_ACTION === 'unpublish') {
  //   error = await runUnpublish();
  // } else if (process.env.GCP_STACK_ACTION === 'deploy') {
  // }

  if (error) {
    process.exit(1);
  }

  process.exit(0);
})();
