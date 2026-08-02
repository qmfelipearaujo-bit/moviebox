import { useEffect } from 'react'
import { hideSystemBars, showSystemBars } from '../services/nativeBridge'

export default function LivePlayerModal({ channel, onClose }) {
  useEffect(() => {
    if (!channel) return
    hideSystemBars()
    return () => { showSystemBars() }
  }, [channel])

  if (!channel) return null
  return (
    <div className="modal player-modal live-player-modal" role="dialog" aria-modal="true">
      <div className="player-shell">
        <div className="player-topbar">
          <strong>{channel.name}</strong>
          <div className="player-actions">
            {channel.homepage && <a className="player-home-btn" href={channel.homepage} target="_blank" rel="noreferrer">Abrir oficial</a>}
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
          </div>
        </div>
        <div className="player-frame-wrap">
          {channel.type === 'video' ? (
            <video src={channel.url} controls autoPlay playsInline className="live-video" />
          ) : (
            <iframe src={channel.url} title={channel.name} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen frameBorder="0" />
          )}
        </div>
      </div>
    </div>
  )
}
