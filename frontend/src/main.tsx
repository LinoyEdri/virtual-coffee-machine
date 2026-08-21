import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bootstrap first, so anything in index.css can override it.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
