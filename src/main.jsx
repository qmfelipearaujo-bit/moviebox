import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('./sw.js', window.location.href).href
    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.warn('MovieBox PWA: service worker não registrado.', error)
    })
  })
}
