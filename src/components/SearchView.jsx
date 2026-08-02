import { useEffect, useState } from 'react'
import { tmdb, normalizeMedia } from '../api/tmdb'
import MediaCard from './MediaCard'

export default function SearchView({ onOpen }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) { setResults([]); return }
    const timer = setTimeout(() => {
      setLoading(true)
      tmdb.search(text)
        .then((data) => setResults((data.results || []).filter((x) => ['movie','tv'].includes(x.media_type) && x.poster_path).map(normalizeMedia)))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <main className="page padded-page">
      <div className="page-head"><div><span className="eyebrow">ENCONTRE ALGO</span><h1>Pesquisar</h1></div></div>
      <div className="search-box"><span>⌕</span><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filmes ou séries…" /></div>
      {loading && <div className="mini-loader">Pesquisando…</div>}
      {!loading && query.trim().length >= 2 && results.length === 0 && <div className="empty">Nenhum resultado encontrado.</div>}
      <div className="media-grid">{results.map((item) => <MediaCard key={`${item.media_type}-${item.id}`} item={item} onOpen={onOpen} />)}</div>
    </main>
  )
}
