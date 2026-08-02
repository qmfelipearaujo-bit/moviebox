import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { hideSystemBars, setNativePlayerMode, showSystemBars } from '../services/nativeBridge'

const STRICT_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-presentation',
  'allow-orientation-lock',
  'allow-pointer-lock'
].join(' ')

const IOS_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-modals',
  'allow-presentation',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-storage-access-by-user-activation'
].join(' ')

function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function PlayerModal({ title, src, onClose, onHome }) {
  const ios = useMemo(() => isIosDevice(), [])
  const android = Capacitor.getPlatform() === 'android'
  const [mode, setMode] = useState(ios ? 'ios' : 'strict')
  const [reloadKey, setReloadKey] = useState(0)
  const shellRef = useRef(null)

  useEffect(() => {
    if (!src) return
    let alive = true
    const keepImmersive = () => { if (alive) hideSystemBars() }

    setNativePlayerMode(true)
    keepImmersive()
    const t1 = setTimeout(keepImmersive, 120)
    const t2 = setTimeout(keepImmersive, 500)
    // Alguns players fazem o Android reapresentar as barras ao trocar orientação
    // ou entrar no fullscreen próprio. Enquanto o player estiver aberto, reforçamos
    // o modo imersivo periodicamente.
    const interval = android ? setInterval(keepImmersive, 1400) : null

    document.addEventListener('fullscreenchange', keepImmersive)
    document.addEventListener('webkitfullscreenchange', keepImmersive)
    window.addEventListener('orientationchange', keepImmersive)
    window.addEventListener('focus', keepImmersive)

    return () => {
      alive = false
      clearTimeout(t1); clearTimeout(t2)
      if (interval) clearInterval(interval)
      document.removeEventListener('fullscreenchange', keepImmersive)
      document.removeEventListener('webkitfullscreenchange', keepImmersive)
      window.removeEventListener('orientationchange', keepImmersive)
      window.removeEventListener('focus', keepImmersive)
      setNativePlayerMode(false)
      showSystemBars()
    }
  }, [src, android])

  const sandbox = useMemo(() => {
    if (mode === 'compat') return undefined
    return mode === 'ios' ? IOS_SANDBOX : STRICT_SANDBOX
  }, [mode])

  const modeLabel = mode === 'strict' ? '🛡️ Proteção forte' : mode === 'ios' ? '🍎 iPhone compatível' : '⚠️ Compatibilidade total'

  const nextMode = () => {
    setMode((current) => {
      if (ios) return current === 'ios' ? 'compat' : 'ios'
      return current === 'strict' ? 'compat' : 'strict'
    })
    setReloadKey((value) => value + 1)
  }

  const fullscreen = async () => {
    try {
      await setNativePlayerMode(true)
      await hideSystemBars()
      const el = shellRef.current
      if (el?.requestFullscreen) await el.requestFullscreen()
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen()
      setTimeout(() => hideSystemBars(), 180)
      setTimeout(() => hideSystemBars(), 700)
    } catch {}
  }

  if (!src) return null

  return (
    <div className="modal player-modal" role="dialog" aria-modal="true">
      <div className="player-shell" ref={shellRef}>
        <div className="player-topbar">
          <strong>{title}</strong>
          <div className="player-actions">
            <button type="button" className="player-home-btn" onClick={onHome} title="Voltar ao início do Media Box">⌂ Início</button>
            <button type="button" className="player-home-btn player-fullscreen-btn" onClick={fullscreen} title="Ocultar as barras do aparelho e usar a tela inteira">⛶ Tela cheia</button>
            <button type="button" className={`player-protection ${mode === 'strict' ? 'is-on' : mode === 'ios' ? 'is-ios' : 'is-off'}`} onClick={nextMode} title={mode === 'strict' ? 'Sandbox + filtro nativo de anúncios no APK Android' : mode === 'ios' ? 'Modo otimizado para Safari/iPhone, mantendo pop-ups e redirecionamentos bloqueados' : 'Modo compatibilidade total: sem sandbox; use apenas se o player não abrir de outra forma'}>{modeLabel}</button>
            <button type="button" className="icon-btn" onClick={() => setReloadKey((value) => value + 1)} aria-label="Recarregar player" title="Recarregar player">↻</button>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
          </div>
        </div>
        <div className="player-frame-wrap">
          <iframe key={`${src}-${mode}-${reloadKey}`} src={src} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen frameBorder="0" scrolling="no" referrerPolicy="no-referrer" sandbox={sandbox} />
        </div>
        {mode !== 'compat' && <div className="player-security-note">{mode === 'ios' ? '🍎 Modo iPhone: permissões necessárias ao Safari liberadas, mantendo pop-ups e redirecionamentos bloqueados.' : android ? '🛡️ APK Android: pop-ups/redirecionamentos bloqueados e filtro nativo tenta remover requisições de anúncios/VAST antes de chegarem ao player.' : '🛡️ Pop-ups, novas abas e redirecionamentos para fora do Media Box estão bloqueados.'}</div>}
        {mode === 'compat' && <div className="player-security-note player-security-warning">⚠️ Compatibilidade total está ativa. O filtro nativo Android continua tentando bloquear redes de anúncios, mas o iframe fica menos restrito.</div>}
      </div>
    </div>
  )
}
