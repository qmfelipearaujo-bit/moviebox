import { TMDB_IMAGE } from '../config'
import { normalizeMedia } from '../api/tmdb'

export default function Hero({ item, onOpen, onPlay }) {
  if (!item) return null
  const media = normalizeMedia(item)
  const backdrop = media.backdrop_path ? `${TMDB_IMAGE}/original${media.backdrop_path}` : null
  return (
    <section className="hero" style={backdrop ? { backgroundImage: `linear-gradient(90deg, rgba(7,8,13,.97) 5%, rgba(7,8,13,.54) 55%, rgba(7,8,13,.9)), linear-gradient(0deg, #07080d 0%, transparent 45%), url(${backdrop})` } : undefined}>
      <div className="hero-copy">
        <span className="eyebrow">EM DESTAQUE</span>
        <h1>{media.displayTitle}</h1>
        <div className="hero-meta"><span>★ {Number(media.vote_average || 0).toFixed(1)}</span><span>{media.displayDate?.slice(0,4) || '—'}</span><span>{media.media_type === 'tv' ? 'Série' : 'Filme'}</span></div>
        <p>{media.overview || 'Selecione para ver os detalhes deste título.'}</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => onPlay(media)}>▶ Assistir</button>
          <button className="secondary" onClick={() => onOpen(media)}>ⓘ Detalhes</button>
        </div>
      </div>
    </section>
  )
}
