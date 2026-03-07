import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Hide the static crawler content once React takes over
const crawlerDiv = document.getElementById('crawler-content');
if (crawlerDiv) crawlerDiv.style.display = 'none';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
