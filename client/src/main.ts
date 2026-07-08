import { initApp } from './app.ts';
import { getGameElements } from './dom.ts';

const elements = getGameElements();

initApp(elements).catch((error: unknown) => {
  elements.message.textContent = 'The puzzle could not be loaded. Run npm run dev from the client folder and try again.';
  console.error(error);
});