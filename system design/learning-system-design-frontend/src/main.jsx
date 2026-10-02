import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Shared cross-page design system. Loaded before the page stylesheets so that
// the page-scoped rules in src/pages/*.css always win on specificity.
import './styles/ui.css'
import App from './App.jsx'
// Loaded last on purpose: an accessibility floor for controls, layered over page CSS.
import './styles/interactive.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
