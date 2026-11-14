import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import './styles.css';
import App from './App.jsx';
import { AuthProvider, JourneyProvider, ToastProvider } from './state.jsx';
import { IS_STATIC } from './api.js';

// Static hosts can't route deep links to index.html, so the static build uses #/ URLs.
const Router = IS_STATIC ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <ToastProvider>
          <JourneyProvider>
            <App />
          </JourneyProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  </StrictMode>,
);
