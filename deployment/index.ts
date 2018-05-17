import { run as runDeploy } from './autodeploy';
import { run as runRemove } from './autoremove';

(async function (): Promise<void> {
  const GCP_STACK_ACTION = process.env.GCP_STACK_ACTION;
  console.log(`Running process: ${GCP_STACK_ACTION}`);

  try {
    if (GCP_STACK_ACTION === 'publish') {
      await runDeploy();
    }

    if (GCP_STACK_ACTION === 'unpublish') {
      await runRemove();
    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})();
