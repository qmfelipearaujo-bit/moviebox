export default function LocalPlayerModal({ title, src, onClose }) {
  if (!src) return null
  return (
    <div className="modal player-modal" role="dialog" aria-modal="true">
      <div className="player-shell">
        <div className="player-topbar">
          <strong>{title}</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <video className="local-video" src={src} controls autoPlay playsInline preload="metadata" />
      </div>
    </div>
  )
}
