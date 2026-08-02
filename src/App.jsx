import { useEffect, useMemo, useState } from 'react'
import { APP_NAME, hasTmdbToken, setTmdbToken, clearTmdbToken } from './config'
import { tmdb, normalizeMedia } from './api/tmdb'
import { embedEpisode, embedMovie, embedSeries } from './services/embed'
import { addToHistory } from './services/storage'
import { startCloudAutoSync } from './services/cloudAccount'
import Hero from './components/Hero'
import MediaRow from './components/MediaRow'
import DetailModal from './components/DetailModal'
import PlayerModal from './components/PlayerModal'
import SearchView from './components/SearchView'
import LibraryView from './components/LibraryView'
import DownloadsView from './components/DownloadsView'
import LiveView from './components/LiveView'
import AccountView from './components/AccountView'
import PwaInstallHint from './components/PwaInstallHint'

const GENRE_ROWS = [
  ['action', 'Ação', 28],
  ['comedy', 'Comédia', 35],
  ['thriller', 'Suspense', 53],
  ['horror', 'Terror', 27],
  ['scifi', 'Ficção científica', 878],
  ['animation', 'Animação', 16],
  ['romance', 'Romance', 10749],
  ['crime', 'Crime', 80],
  ['family', 'Família', 10751],
  ['documentary', 'Documentários', 99],
]

const movieList = (data = []) => data.map((x) => normalizeMedia({ ...x, media_type: 'movie' }))
const tvList = (data = []) => data.map((x) => normalizeMedia({ ...x, media_type: 'tv' }))
const unique = (items = []) => [...new Map(items.map((x) => [`${x.media_type}:${x.id}`, x])).values()]

async function pair(loader, normalizer) {
  const results = await Promise.allSettled([loader(1), loader(2)])
  return unique(results.flatMap((r) => r.status === 'fulfilled' ? normalizer(r.value?.results || []) : []))
}

function Header({ view, setView }) {
  const links = [['home','Início'],['search','Pesquisar'],['library','Minha lista'],['downloads','Offline'],['live','Ao vivo'],['account','Conta']]
  return (
    <header className="app-header">
      <button className="brand" onClick={() => setView('home')}><span className="brand-mark">M</span><span>{APP_NAME}</span></button>
      <nav>{links.map(([key,label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}</nav>
    </header>
  )
}

function BottomNav({ view, setView }) {
  const links = [['home','⌂','Início'],['search','⌕','Buscar'],['library','♡','Lista'],['live','◉','Ao vivo'],['downloads','⇩','Offline'],['account','♙','Conta']]
  return <nav className="bottom-nav">{links.map(([key, icon, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><span>{icon}</span><small>{label}</small></button>)}</nav>
}

function TokenSetup({ message }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const save = () => {
    const token = value.trim()
    if (token.length < 40) { setError('Cole o API Read Access Token completo do TMDB.'); return }
    setTmdbToken(token)
    window.location.reload()
  }
  return (
    <div className="setup-card">
      <div className="setup-icon">🔑</div>
      <div><span className="eyebrow">CONFIGURAÇÃO INICIAL</span><h2>Conecte o TMDB</h2><p>{message || 'Cole o seu API Read Access Token do TMDB. Ele ficará salvo somente neste aparelho.'}</p><input className="token-input" type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiJ9..." autoComplete="off" />{error && <div className="token-error">{error}</div>}<div className="token-actions"><button className="primary" onClick={save}>Salvar token</button></div></div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('home')
  const [rows, setRows] = useState({ trending: [], movies: [], tv: [], newMovies: [], top: [] })
  const [genres, setGenres] = useState({})
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState(false)
  const [selected, setSelected] = useState(null)
  const [player, setPlayer] = useState(null)

  useEffect(() => startCloudAutoSync(), [])

  useEffect(() => {
    if (!hasTmdbToken()) { setLoading(false); return }
    let alive = true
    async function loadCatalog() {
      setLoading(true); setCatalogError(false)
      try {
        const [trendingR, moviesR, tvR, newR, topR, genreResults] = await Promise.all([
          tmdb.trending().catch(() => ({ results: [] })),
          pair(tmdb.popularMovies, movieList),
          pair(tmdb.popularTv, tvList),
          pair(tmdb.nowPlaying, movieList),
          pair(tmdb.topRatedMovies, movieList),
          Promise.allSettled(GENRE_ROWS.map(async ([key, label, id]) => [key, label, movieList((await tmdb.discoverMovies(id, 1)).results || [])])),
        ])
        if (!alive) return
        const trending = (trendingR.results || []).filter((x) => ['movie','tv'].includes(x.media_type)).map(normalizeMedia)
        if (!trending.length && !moviesR.length && !tvR.length) { setCatalogError(true); return }
        setRows({ trending, movies: moviesR, tv: tvR, newMovies: newR, top: topR })
        const nextGenres = {}
        genreResults.forEach((r) => { if (r.status === 'fulfilled') nextGenres[r.value[0]] = { title: r.value[1], items: r.value[2] } })
        setGenres(nextGenres)
      } catch { if (alive) setCatalogError(true) }
      finally { if (alive) setLoading(false) }
    }
    loadCatalog()
    return () => { alive = false }
  }, [])

  const hero = useMemo(() => rows.trending.find((x) => x.backdrop_path && x.overview) || rows.movies[0], [rows])

  const play = (media) => {
    addToHistory(media)
    setPlayer({ title: media.displayTitle || media.title || media.name, src: media.media_type === 'tv' ? embedSeries(media.id) : embedMovie(media.id) })
  }

  const playEpisode = (show, season, episode, ep) => {
    addToHistory(show, { season, episode, episodeName: ep?.name })
    setPlayer({ title: `${show.displayTitle || show.name} · T${season} E${episode}`, src: embedEpisode(show.id, season, episode) })
  }

  const goHomeFromPlayer = () => {
    setPlayer(null)
    setSelected(null)
    setView('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetToken = () => { clearTmdbToken(); window.location.reload() }

  return (
    <div className="app-shell">
      <Header view={view} setView={setView} />
      <PwaInstallHint />
      {view === 'home' && <main className="page home-page">
        {!hasTmdbToken() ? <TokenSetup /> : catalogError ? <div className="setup-card"><div className="setup-icon">⚠️</div><div><span className="eyebrow">TMDB</span><h2>Não foi possível carregar o catálogo</h2><p>Verifique sua internet e o token do TMDB. Se o token estiver incorreto, cadastre-o novamente.</p><button className="secondary" onClick={resetToken}>Alterar token</button></div></div> : loading ? <div className="full-loader"><span className="loader" /><p>Carregando um catálogo maior…</p></div> : <>
          <Hero item={hero} onOpen={setSelected} onPlay={play} />
          <div className="rows-wrap">
            <MediaRow title="Em alta hoje" items={rows.trending} onOpen={setSelected} />
            <MediaRow title="Filmes populares" items={rows.movies} onOpen={setSelected} />
            <MediaRow title="Séries populares" items={rows.tv} onOpen={setSelected} />
            <MediaRow title="Nos cinemas" items={rows.newMovies} onOpen={setSelected} />
            {GENRE_ROWS.map(([key]) => genres[key] ? <MediaRow key={key} title={genres[key].title} items={genres[key].items} onOpen={setSelected} /> : null)}
            <MediaRow title="Mais bem avaliados" items={rows.top} onOpen={setSelected} />
          </div>
        </>}
      </main>}
      {view === 'search' && <SearchView onOpen={setSelected} />}
      {view === 'library' && <LibraryView onOpen={setSelected} />}
      {view === 'downloads' && <DownloadsView />}
      {view === 'live' && <LiveView />}
      {view === 'account' && <AccountView />}
      <BottomNav view={view} setView={setView} />
      <DetailModal media={selected} onClose={() => setSelected(null)} onPlay={play} onPlayEpisode={playEpisode} />
      <PlayerModal title={player?.title} src={player?.src} onClose={() => setPlayer(null)} onHome={goHomeFromPlayer} />
    </div>
  )
}
