import { useMemo, useState } from 'react'

const STRICT_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-presentation',
  'allow-orientation-lock',
  'allow-pointer-lock'
].join(' ')

export default function PlayerModal({ title, src, onClose }) {
  const [protectionEnabled, setProtectionEnabled] = useState(true)

  const sandbox = useMemo(
    () => (protectionEnabled ? STRICT_SANDBOX : undefined),
    [protectionEnabled]
  )

  if (!src) return null

  return (
    <div className="modal player-modal" role="dialog" aria-modal="true">
      <div className="player-shell">
        <div className="player-topbar">
          <strong>{title}</strong>
          <div className="player-actions">
            <button
              type="button"
              className={`player-protection ${protectionEnabled ? 'is-on' : 'is-off'}`}
              onClick={() => setProtectionEnabled((value) => !value)}
              title={
                protectionEnabled
                  ? 'Pop-ups e redirecionamentos externos bloqueados'
                  : 'Modo compatibilidade: proteção reduzida'
              }
            >
              {protectionEnabled ? '🛡️ Proteção ativa' : '⚠️ Compatibilidade'}
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
          </div>
        </div>

        <div className="player-frame-wrap">
          <iframe
            key={`${src}-${protectionEnabled ? 'protected' : 'compat'}`}
            src={src}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            frameBorder="0"
            scrolling="no"
            referrerPolicy="no-referrer"
            sandbox={sandbox}
          />
        </div>

        {protectionEnabled && (
          <div className="player-security-note">
            🛡️ Pop-ups, novas abas e redirecionamentos para fora do MovieBox estão bloqueados.
          </div>
        )}
      </div>
    </div>
  )
}
