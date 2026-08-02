import { useEffect, useState } from 'react'

const DISMISS_KEY = 'moviebox:pwa-install-hint-dismissed'

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function PwaInstallHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isIos() || isStandalone()) return
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch (_) {}
    setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch (_) {}
    setVisible(false)
  }

  return (
    <aside className="pwa-install-card" aria-label="Instalar MovieBox no iPhone">
      <div className="pwa-install-icon">📱</div>
      <div className="pwa-install-copy">
        <span className="eyebrow">IPHONE · INSTALAÇÃO GRATUITA</span>
        <strong>Adicione o MovieBox à Tela de Início</strong>
        <p>No Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b> → ative <b>Abrir como App da Web</b>.</p>
      </div>
      <button className="icon-btn pwa-install-close" onClick={dismiss} aria-label="Ocultar instrução">✕</button>
    </aside>
  )
}
