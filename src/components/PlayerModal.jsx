import { useEffect, useMemo, useRef, useState } from 'react'
import { hideSystemBars, showSystemBars } from '../services/nativeBridge'

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
  const [mode, setMode] = useState(ios ? 'ios' : 'strict')
  const [reloadKey, setReloadKey] = useState(0)
  const shellRef = useRef(null)

  useEffect(() => {
    if (!src) return
    hideSystemBars()
    return () => { showSystemBars() }
  }, [src])

  const sandbox = useMemo(() => {
    if (mode === 'compat') return undefined
    return mode === 'ios' ? IOS_SANDBOX : STRICT_SANDBOX
  }, [mode])

  const modeLabel = mode === 'strict' ? '🛡️ Proteção ativa' : mode === 'ios' ? '🍎 iPhone compatível' : '⚠️ Compatibilidade total'

  const nextMode = () => {
    setMode((current) => {
      if (ios) return current === 'ios' ? 'compat' : 'ios'
      return current === 'strict' ? 'compat' : 'strict'
    })
    setReloadKey((value) => value + 1)
  }

  const fullscreen = async () => {
    try {
      await hideSystemBars()
      const el = shellRef.current
      if (el?.requestFullscreen) await el.requestFullscreen()
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } catch {}
  }

  if (!src) return null

  return (
    <div className="modal player-modal" role="dialog" aria-modal="true">
      <div className="player-shell" ref={shellRef}>
        <div className="player-topbar">
          <strong>{title}</strong>
          <div className="player-actions">
            <button type="button" className="player-home-btn" onClick={onHome} title="Voltar ao início do MovieBox">⌂ Início</button>
            <button type="button" className="player-home-btn player-fullscreen-btn" onClick={fullscreen} title="Ocultar barras do sistema quando o aparelho permitir">⛶ Tela cheia</button>
            <button type="button" className={`player-protection ${mode === 'strict' ? 'is-on' : mode === 'ios' ? 'is-ios' : 'is-off'}`} onClick={nextMode} title={mode === 'strict' ? 'Pop-ups e redirecionamentos externos bloqueados' : mode === 'ios' ? 'Modo otimizado para Safari/iPhone, mantendo pop-ups e redirecionamentos bloqueados' : 'Modo compatibilidade total: sem sandbox; use apenas se o player não abrir de outra forma'}>{modeLabel}</button>
            <button type="button" className="icon-btn" onClick={() => setReloadKey((value) => value + 1)} aria-label="Recarregar player" title="Recarregar player">↻</button>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
          </div>
        </div>
        <div className="player-frame-wrap">
          <iframe key={`${src}-${mode}-${reloadKey}`} src={src} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen frameBorder="0" scrolling="no" referrerPolicy="no-referrer" sandbox={sandbox} />
        </div>
        {mode !== 'compat' && <div className="player-security-note">{mode === 'ios' ? '🍎 Modo iPhone: permissões necessárias ao Safari foram liberadas, mas pop-ups e redirecionamentos continuam bloqueados.' : '🛡️ Pop-ups, novas abas e redirecionamentos para fora do MovieBox estão bloqueados.'}</div>}
        {mode === 'compat' && <div className="player-security-note player-security-warning">⚠️ Compatibilidade total está ativa. Se aparecer publicidade externa, volte para o modo iPhone/protegido.</div>}
      </div>
    </div>
  )
}
