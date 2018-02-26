import { run as runDeploy } from './autodeploy';
import { run as runUnpublish } from './autoremove';

(async function (): Promise<void> {
  let error;

  console.log(`Running process: ${process.env.GCP_STACK_ACTION}`);

  try {
    if (process.env.GCP_STACK_ACTION === 'deploy') {
      await runDeploy();  
    }
    
    if (process.env.GCP_STACK_ACTION === 'unpublish') {
      await runUnpublish();
    }  

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})();
