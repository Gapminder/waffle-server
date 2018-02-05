import { run as runDeploy } from './autodeploy';
import { run as runUnpublish } from './autoremove';

(async function (): Promise<void> {
  let error;

  if (process.env.GCP_STACK_ACTION === 'deploy') {
    error = await runDeploy();
  } else if (process.env.GCP_STACK_ACTION === 'unpublish') {
    error = await runUnpublish();
  }

  if (error) {
    process.exit(1);
  }

  process.exit(0);
})();
