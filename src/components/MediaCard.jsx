import { TMDB_IMAGE } from '../config'
import { normalizeMedia } from '../api/tmdb'

export default function MediaCard({ item, onOpen, compact = false }) {
  const media = normalizeMedia(item)
  const poster = media.poster_path ? `${TMDB_IMAGE}/w500${media.poster_path}` : null
  const year = media.displayDate?.slice(0, 4)

  return (
    <button className={`media-card ${compact ? 'compact' : ''}`} onClick={() => onOpen(media)}>
      <div className="poster-wrap">
        {poster ? <img src={poster} alt={media.displayTitle} loading="lazy" /> : <div className="poster-missing">🎬</div>}
        <span className="score">★ {Number(media.vote_average || 0).toFixed(1)}</span>
        <span className="type-badge">{media.media_type === 'tv' ? 'SÉRIE' : 'FILME'}</span>
      </div>
      <div className="card-copy">
        <strong>{media.displayTitle}</strong>
        <span>{year || '—'}</span>
      </div>
    </button>
  )
}
