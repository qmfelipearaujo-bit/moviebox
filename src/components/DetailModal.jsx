import { useEffect, useState } from 'react'
import { tmdb, normalizeMedia } from '../api/tmdb'
import { TMDB_IMAGE } from '../config'
import { isFavorite, toggleFavorite } from '../services/storage'
import SeasonBrowser from './SeasonBrowser'

export default function DetailModal({ media, onClose, onPlay, onPlayEpisode }) {
  const [details, setDetails] = useState(null)
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    if (!media) return
    setDetails(null)
    setFavorite(isFavorite(media.id, media.media_type))
    const loader = media.media_type === 'tv' ? tmdb.tvDetails(media.id) : tmdb.movieDetails(media.id)
    loader.then((data) => setDetails(normalizeMedia({ ...data, media_type: media.media_type }))).catch(() => setDetails(media))
  }, [media])

  if (!media) return null
  const item = details || media
  const backdrop = item.backdrop_path ? `${TMDB_IMAGE}/original${item.backdrop_path}` : null
  const runtime = item.runtime ? `${item.runtime} min` : item.episode_run_time?.[0] ? `${item.episode_run_time[0]} min/ep.` : null

  const handleFavorite = () => {
    toggleFavorite(item)
    setFavorite((v) => !v)
  }

  return (
    <div className="modal detail-modal" role="dialog" aria-modal="true">
      <div className="detail-sheet">
        <button className="close-floating" onClick={onClose}>✕</button>
        <div className="detail-backdrop" style={backdrop ? { backgroundImage: `linear-gradient(0deg,#0d0f16 2%,rgba(13,15,22,.15) 65%),url(${backdrop})` } : undefined} />
        <div className="detail-content">
          <div className="detail-title-line">
            <div><span className="eyebrow">{item.media_type === 'tv' ? 'SÉRIE' : 'FILME'}</span><h2>{item.displayTitle}</h2></div>
            <div className="detail-actions">
              <button className="primary" onClick={() => onPlay(item)}>▶ Assistir</button>
              <button className="secondary" onClick={handleFavorite}>{favorite ? '✓ Minha lista' : '+ Minha lista'}</button>
            </div>
          </div>
          <div className="hero-meta"><span>★ {Number(item.vote_average || 0).toFixed(1)}</span><span>{item.displayDate?.slice(0,4) || '—'}</span>{runtime && <span>{runtime}</span>}</div>
          <p className="detail-overview">{item.overview || 'Sinopse não disponível.'}</p>
          {item.genres?.length ? <div className="chips">{item.genres.map((g) => <span key={g.id}>{g.name}</span>)}</div> : null}
          {item.media_type === 'tv' && details ? <SeasonBrowser show={item} onPlayEpisode={(season, episode, ep) => onPlayEpisode(item, season, episode, ep)} /> : null}
        </div>
      </div>
    </div>
  )
}
