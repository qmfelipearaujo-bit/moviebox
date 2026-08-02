import { useEffect, useMemo, useState } from 'react'
import { APP_NAME, hasTmdbToken, setTmdbToken, clearTmdbToken } from './config'
import { tmdb, normalizeMedia } from './api/tmdb'
import { embedEpisode, embedMovie, embedSeries } from './services/embed'
import { addToHistory } from './services/storage'
import Hero from './components/Hero'
import MediaRow from './components/MediaRow'
import DetailModal from './components/DetailModal'
import PlayerModal from './components/PlayerModal'
import SearchView from './components/SearchView'
import LibraryView from './components/LibraryView'
import DownloadsView from './components/DownloadsView'
import PwaInstallHint from './components/PwaInstallHint'

function Header({ view, setView }) {
  return (
    <header className="app-header">
      <button className="brand" onClick={() => setView('home')}><span className="brand-mark">M</span><span>{APP_NAME}</span></button>
      <nav>
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Início</button>
        <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>Pesquisar</button>
        <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>Minha lista</button>
        <button className={view === 'downloads' ? 'active' : ''} onClick={() => setView('downloads')}>Offline</button>
      </nav>
    </header>
  )
}

function BottomNav({ view, setView }) {
  const links = [['home','⌂','Início'],['search','⌕','Buscar'],['library','♡','Lista'],['downloads','⇩','Offline']]
  return <nav className="bottom-nav">{links.map(([key, icon, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><span>{icon}</span><small>{label}</small></button>)}</nav>
}

function TokenSetup({ message }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const save = () => {
    const token = value.trim()
    if (token.length < 40) {
      setError('Cole o API Read Access Token completo do TMDB.')
      return
    }
    setTmdbToken(token)
    window.location.reload()
  }
  return (
    <div className="setup-card">
      <div className="setup-icon">🔑</div>
      <div>
        <span className="eyebrow">CONFIGURAÇÃO INICIAL</span>
        <h2>Conecte o TMDB</h2>
        <p>{message || 'Cole o seu API Read Access Token do TMDB. Ele ficará salvo somente neste aparelho.'}</p>
        <input className="token-input" type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiJ9..." autoComplete="off" />
        {error && <div className="token-error">{error}</div>}
        <div className="token-actions"><button className="primary" onClick={save}>Salvar token</button></div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('home')
  const [rows, setRows] = useState({ trending: [], movies: [], tv: [], newMovies: [], top: [] })
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState(false)
  const [selected, setSelected] = useState(null)
  const [player, setPlayer] = useState(null)

  useEffect(() => {
    if (!hasTmdbToken()) { setLoading(false); return }
    Promise.allSettled([tmdb.trending(), tmdb.popularMovies(), tmdb.popularTv(), tmdb.nowPlaying(), tmdb.topRatedMovies()])
      .then((results) => {
        const [trending, movies, tv, newMovies, top] = results
        if (results.every((r) => r.status === 'rejected')) {
          setCatalogError(true)
          return
        }
        setRows({
          trending: trending.value?.results?.filter((x) => ['movie','tv'].includes(x.media_type)).map(normalizeMedia) || [],
          movies: movies.value?.results?.map((x) => normalizeMedia({ ...x, media_type: 'movie' })) || [],
          tv: tv.value?.results?.map((x) => normalizeMedia({ ...x, media_type: 'tv' })) || [],
          newMovies: newMovies.value?.results?.map((x) => normalizeMedia({ ...x, media_type: 'movie' })) || [],
          top: top.value?.results?.map((x) => normalizeMedia({ ...x, media_type: 'movie' })) || [],
        })
      })
      .finally(() => setLoading(false))
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

  const resetToken = () => {
    clearTmdbToken()
    window.location.reload()
  }

  return (
    <div className="app-shell">
      <Header view={view} setView={setView} />
      <PwaInstallHint />
      {view === 'home' && (
        <main className="page home-page">
          {!hasTmdbToken() ? <TokenSetup /> : catalogError ? <div className="setup-card"><div className="setup-icon">⚠️</div><div><span className="eyebrow">TMDB</span><h2>Não foi possível carregar o catálogo</h2><p>Verifique sua internet e o token do TMDB. Se o token estiver incorreto, cadastre-o novamente.</p><button className="secondary" onClick={resetToken}>Alterar token</button></div></div> : loading ? <div className="full-loader"><span className="loader" /><p>Carregando catálogo…</p></div> : <>
            <Hero item={hero} onOpen={setSelected} onPlay={play} />
            <div className="rows-wrap">
              <MediaRow title="Em alta hoje" items={rows.trending} onOpen={setSelected} />
              <MediaRow title="Filmes populares" items={rows.movies} onOpen={setSelected} />
              <MediaRow title="Séries populares" items={rows.tv} onOpen={setSelected} />
              <MediaRow title="Nos cinemas" items={rows.newMovies} onOpen={setSelected} />
              <MediaRow title="Mais bem avaliados" items={rows.top} onOpen={setSelected} />
            </div>
          </>}
        </main>
      )}
      {view === 'search' && <SearchView onOpen={setSelected} />}
      {view === 'library' && <LibraryView onOpen={setSelected} />}
      {view === 'downloads' && <DownloadsView />}
      <BottomNav view={view} setView={setView} />
      <DetailModal media={selected} onClose={() => setSelected(null)} onPlay={play} onPlayEpisode={playEpisode} />
      <PlayerModal title={player?.title} src={player?.src} onClose={() => setPlayer(null)} />
    </div>
  )
}
