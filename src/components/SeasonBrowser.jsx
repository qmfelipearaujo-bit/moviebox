import { useEffect, useState } from 'react'
import { tmdb } from '../api/tmdb'

export default function SeasonBrowser({ show, onPlayEpisode }) {
  const seasons = (show.seasons || []).filter((s) => s.season_number > 0)
  const [selected, setSelected] = useState(seasons[0]?.season_number || 1)
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    tmdb.season(show.id, selected)
      .then((data) => !ignore && setEpisodes(data.episodes || []))
      .catch(() => !ignore && setEpisodes([]))
      .finally(() => !ignore && setLoading(false))
    return () => { ignore = true }
  }, [show.id, selected])

  if (!seasons.length) return null
  return (
    <div className="season-browser">
      <div className="season-head">
        <h3>Episódios</h3>
        <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
          {seasons.map((s) => <option key={s.id} value={s.season_number}>{s.name || `Temporada ${s.season_number}`}</option>)}
        </select>
      </div>
      {loading ? <div className="mini-loader">Carregando episódios…</div> : (
        <div className="episode-list">
          {episodes.map((ep) => (
            <button key={ep.id} className="episode" onClick={() => onPlayEpisode(selected, ep.episode_number, ep)}>
              <div className="episode-number">{ep.episode_number}</div>
              <div><strong>{ep.name}</strong><p>{ep.overview || 'Sem sinopse disponível.'}</p></div>
              <span>▶</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
