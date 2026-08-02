export default function PlayerModal({ title, src, onClose }) {
  if (!src) return null
  return (
    <div className="modal player-modal" role="dialog" aria-modal="true">
      <div className="player-shell">
        <div className="player-topbar">
          <strong>{title}</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <iframe
          src={src}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          frameBorder="0"
          scrolling="no"
          referrerPolicy="origin"
        />
      </div>
    </div>
  )
}
