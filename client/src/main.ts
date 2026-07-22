import { initApp } from './app.ts';
import { ensureCurrentDeployment } from './deploymentVersion.ts';
import { getGameElements } from './dom.ts';

async function start(): Promise<void> {
  const shouldStart = await ensureCurrentDeployment();

  if (!shouldStart) {
    return;
  }

  const elements = getGameElements();

  try {
    await initApp(elements);
  } catch (error) {
    elements.message.textContent =
      'The puzzle could not be loaded. Run npm run dev from the client folder and try again.';
    console.error(error);
  }
}

void start();
