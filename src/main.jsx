import { bootTrace } from './rendererBootTrace.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './palette.css'
import App from './App.jsx'
import './m3eimports.js'
import './ccgapps_liquid_glass_svg.js'
import './ripple-replacer.js'
import { AppProvider } from './store/AppContext'
import { initTableSelection } from './utils/tableSelection.js'

bootTrace('main.jsx: imports finished (after m3e / liquid / ripple)')

initTableSelection()

const root = document.createElement('div');
root.id = 'react-global-root';
root.style.display = 'none';
document.body.appendChild(root);

bootTrace('react-global-root appended to body');

document.getElementById('minimize')?.addEventListener('click', () => window.api?.minimize?.());
document.getElementById('maximize')?.addEventListener('click', () => window.api?.maximize?.());
document.getElementById('close')?.addEventListener('click', () => window.api?.close?.());

bootTrace('window controls listeners attached');

try {
  bootTrace('createRoot().render(...) begin');
  createRoot(root).render(
    <StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </StrictMode>,
  );
  bootTrace('createRoot().render(...) returned (sync)');
} catch (e) {
  bootTrace('createRoot().render threw (sync)', { message: e?.message, stack: e?.stack });
  // eslint-disable-next-line no-console
  console.error(e);
}

queueMicrotask(() => bootTrace('queueMicrotask after render'));

setTimeout(() => bootTrace('setTimeout(0) after render'), 0);

requestAnimationFrame(() => bootTrace('requestAnimationFrame after render'));

setTimeout(() => bootTrace('setTimeout(500ms) still alive'), 500);
