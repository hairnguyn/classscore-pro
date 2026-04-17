import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './palette.css'
import App from './App.jsx'
import './m3eimports.js'
import { AppProvider } from './store/AppContext.jsx'

const rootElement = document.createElement('div');
rootElement.id = 'react-global-root';
rootElement.style.display = 'none';
document.body.appendChild(rootElement);

document.getElementById('minimize')?.addEventListener('click', () => window.api?.minimize?.());
document.getElementById('maximize')?.addEventListener('click', () => window.api?.maximize?.());
document.getElementById('close')?.addEventListener('click', () => window.api?.close?.());

createRoot(document.getElementById('react-global-root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
