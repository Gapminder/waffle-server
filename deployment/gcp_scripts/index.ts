import { run as runDeploy } from './autodeploy';
import { run as runUnpublish } from './autoremove';

if (process.env.GCP_STACK_ACTION === 'unpublish') {
  runUnpublish((error: string) => {
    if (error) {
      process.exit(1);
    }
    process.exit(0);
  });
} else if (process.env.GCP_STACK_ACTION === 'deploy') {
  runDeploy((error: string) => {
    if (error) {
      process.exit(1);
    }
    process.exit(0);
  });
}
