import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import './styles/blog-category-tabs-overrides.css';
import './styles/cyber-text-reveal.css';
import './styles/loading.css';
import './styles/font-overrides.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
