import { app } from './app.js';
import { env } from './config/env.js';
import { promoteSuperadminEmails } from './services/superadmin-bootstrap.js';

const configuredHost = env.LISTEN_HOST?.trim();
const host =
  configuredHost && configuredHost.length > 0
    ? configuredHost
    : env.NODE_ENV === 'production'
      ? '0.0.0.0'
      : '127.0.0.1';

async function main() {
  await promoteSuperadminEmails();

  app.listen(env.PORT, host, () => {
    console.log(`API http://${host}:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
