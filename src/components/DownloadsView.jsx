import { useEffect, useMemo, useState } from 'react'
import { OFFLINE_CATALOG } from '../data/offlineCatalog'
import { formatBytes as commonsFormatBytes, getCommonsMedia } from '../services/commons'
import { getArchiveMovie, searchOpenMovies, formatBytes as archiveFormatBytes } from '../services/internetArchive'
import { addCustomSource, getCustomSources, removeCustomSource } from '../services/customSources'
import { deleteOfflineMovie, downloadOfflineMovie, getOfflineMovieSrc, isNativeOfflineSupported, reconcileOfflineDownloads } from '../services/offlineDownloads'
import { getDownloads } from '../services/storage'
import LocalPlayerModal from './LocalPlayerModal'

function DownloadProgress({ task, formatBytes = commonsFormatBytes }) {
  return (
    <div className="download-progress-wrap">
      <div className="download-progress-line"><span>Baixando {task.percent == null ? '' : `${task.percent}%`}</span><strong>{task.bytes ? formatBytes(task.bytes) : ''}</strong></div>
      <div className="download-progress"><span style={{ width: `${task.percent || 4}%` }} /></div>
    </div>
  )
}

function CuratedCard({ item, media, downloaded, task, onDownload, onPlay, onDelete }) {
  const [quality, setQuality] = useState('')
  const options = media?.options || []
  const selected = useMemo(() => options.find((o) => o.quality === quality) || options.find((o) => o.height === 720) || options.find((o) => o.height === 480) || options[0], [options, quality])

  return (
    <article className="offline-card">
      <div className="offline-poster">
        {media?.thumbUrl ? <img src={media.thumbUrl} alt="" loading="lazy" /> : <div className="offline-placeholder">🎬</div>}
        <span className="license-badge">{media?.license || item.expectedLicense}</span>
      </div>
      <div className="offline-card-copy">
        <span className="eyebrow">OPEN MOVIE · {item.year}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="offline-credit">{item.attribution}</div>
        {downloaded ? (
          <div className="offline-actions"><button className="primary" onClick={() => onPlay(downloaded)}>▶ Assistir offline</button><button className="secondary" onClick={() => onDelete(downloaded)}>Excluir</button></div>
        ) : task?.status === 'downloading' ? <DownloadProgress task={task} /> : media?.error ? (
          <div className="offline-error">Não foi possível consultar o arquivo agora. Verifique a internet e tente novamente.</div>
        ) : !media ? <div className="mini-loader">Consultando qualidades…</div> : (
          <>
            <div className="quality-line"><label>Qualidade</label><select value={selected?.quality || ''} onChange={(e) => setQuality(e.target.value)}>{options.map((o) => <option key={`${o.quality}-${o.url}`} value={o.quality}>{o.quality}{o.estimatedBytes ? ` · ~${commonsFormatBytes(o.estimatedBytes)}` : ''}</option>)}</select></div>
            <div className="offline-actions"><button className="primary" disabled={!selected} onClick={() => onDownload(item, media, selected)}>⬇ Baixar</button><a className="secondary link-button" href={media.descriptionUrl} target="_blank" rel="noreferrer">Fonte e licença</a></div>
          </>
        )}
      </div>
    </article>
  )
}

function ArchiveCard({ item, resolved, downloaded, task, onResolve, onDownload, onPlay, onDelete, onMessage }) {
  const [quality, setQuality] = useState('')
  const options = resolved?.options || []
  const selected = useMemo(() => options.find((o) => o.quality === quality) || options.find((o) => o.height === 720) || options.find((o) => o.height === 480) || options[0], [options, quality])
  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); onMessage('Link copiado.') } catch { onMessage('Não foi possível copiar automaticamente. Abra a fonte para copiar o link.') }
  }

  return (
    <article className="offline-card archive-card">
      <div className="offline-poster">
        <img src={item.thumbUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <span className="license-badge">{resolved?.license || item.license}</span>
      </div>
      <div className="offline-card-copy">
        <span className="eyebrow">INTERNET ARCHIVE {item.year ? `· ${item.year}` : ''}</span>
        <h3>{item.title}</h3>
        <p>{resolved?.description || item.description}</p>
        {(resolved?.creator || item.creator) && <div className="offline-credit">{resolved?.creator || item.creator}</div>}

        {downloaded ? (
          <div className="offline-actions"><button className="primary" onClick={() => onPlay(downloaded)}>▶ Assistir offline</button><button className="secondary" onClick={() => onDelete(downloaded)}>Excluir</button></div>
        ) : task?.status === 'downloading' ? <DownloadProgress task={task} formatBytes={archiveFormatBytes} /> : resolved?.error ? (
          <div className="offline-error">{resolved.message}</div>
        ) : !resolved ? (
          <div className="offline-actions"><button className="primary" onClick={() => onResolve(item)}>Encontrar downloads</button><a className="secondary link-button" href={item.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte</a></div>
        ) : (
          <>
            <div className="quality-line"><label>Arquivo</label><select value={selected?.quality || ''} onChange={(e) => setQuality(e.target.value)}>{options.map((o) => <option key={`${o.quality}-${o.url}`} value={o.quality}>{o.quality}{o.estimatedBytes ? ` · ${archiveFormatBytes(o.estimatedBytes)}` : ''}</option>)}</select></div>
            <div className="offline-actions"><button className="primary" disabled={!selected} onClick={() => onDownload({ ...item, license: resolved.license, creator: resolved.creator }, resolved, selected)}>⬇ Baixar vídeo</button><a className="secondary link-button" href={resolved.sourceUrl} target="_blank" rel="noreferrer">Fonte</a></div>
            {resolved.torrentUrl && <div className="torrent-line"><span>Também há torrent oficial deste item.</span><a className="text-btn" href={resolved.torrentUrl} target="_blank" rel="noreferrer">Abrir .torrent</a><button className="text-btn" onClick={() => copy(resolved.torrentUrl)}>Copiar</button></div>}
          </>
        )}
      </div>
    </article>
  )
}

function CustomSources({ sources, onAdd, onRemove, downloads, tasks, onDownload, onPlay, onDelete, onMessage }) {
  const [form, setForm] = useState({ title: '', url: '', license: '', poster: '' })
  const submit = (e) => {
    e.preventDefault()
    try {
      onAdd(form)
      setForm({ title: '', url: '', license: '', poster: '' })
      onMessage('Fonte adicionada.')
    } catch (error) { onMessage(error?.message || 'Não foi possível adicionar a fonte.') }
  }
  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); onMessage('Link copiado.') } catch { onMessage('Não foi possível copiar automaticamente.') }
  }

  return (
    <div className="custom-source-wrap">
      <form className="custom-source-form" onSubmit={submit}>
        <div><span className="eyebrow">LABORATÓRIO DE LINKS</span><h2>Adicionar sua própria fonte</h2><p>Use uma URL direta HTTP/HTTPS de vídeo, um arquivo .torrent ou magnet. O MovieBox usa exatamente a fonte que você informar e não exige um tipo específico de licença para habilitar a função.</p></div>
        <label>Título<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Meu filme de teste" /></label>
        <label>URL / Magnet<textarea value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://servidor/filme.mp4  ou  magnet:?xt=..." rows="3" required /></label>
        <div className="form-two"><label>Direitos / observação<input value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} placeholder="Opcional" /></label><label>Poster opcional<input value={form.poster} onChange={(e) => setForm({ ...form, poster: e.target.value })} placeholder="https://.../poster.jpg" /></label></div>
        <button className="primary" type="submit">+ Adicionar fonte</button>
      </form>

      {!sources.length ? <div className="empty">Nenhuma fonte personalizada cadastrada.</div> : <div className="custom-source-list">{sources.map((item) => {
        const downloaded = downloads.find((d) => d.downloadId === item.id)
        const task = tasks[item.id]
        const direct = item.type === 'direct'
        const mime = /\.webm(?:\?|$)/i.test(item.url) ? 'video/webm' : /\.ogv(?:\?|$)/i.test(item.url) ? 'video/ogg' : 'video/mp4'
        return <article className="custom-source-card" key={item.id}>
          <div className="custom-source-icon">{direct ? '🎞️' : item.type === 'magnet' ? '🧲' : '🌐'}</div>
          <div className="custom-source-info"><span className="eyebrow">{item.type === 'direct' ? 'DOWNLOAD DIRETO' : item.type === 'magnet' ? 'MAGNET' : 'TORRENT'}</span><h3>{item.title}</h3><p className="source-url">{item.url}</p><small>{item.license || 'Direitos não informados'}</small>
            {task?.status === 'downloading' && <DownloadProgress task={task} />}
          </div>
          <div className="custom-source-actions">
            {downloaded ? <><button className="primary" onClick={() => onPlay(downloaded)}>▶ Assistir</button><button className="secondary" onClick={() => onDelete(downloaded)}>Excluir arquivo</button></> : direct ? <button className="primary" onClick={() => onDownload(item, { sourceUrl: item.url, license: item.license, thumbUrl: item.poster }, { url: item.url, quality: 'Original', mime })}>⬇ Baixar</button> : <a className="primary link-button" href={item.url} target="_blank" rel="noreferrer">Abrir no cliente torrent</a>}
            <button className="secondary" onClick={() => copy(item.url)}>Copiar link</button><button className="text-btn danger" onClick={() => onRemove(item.id)}>Remover fonte</button>
          </div>
        </article>
      })}</div>}
    </div>
  )
}

export default function DownloadsView() {
  const [tab, setTab] = useState('archive')
  const [metadata, setMetadata] = useState({})
  const [downloads, setDownloads] = useState([])
  const [tasks, setTasks] = useState({})
  const [player, setPlayer] = useState(null)
  const [message, setMessage] = useState('')
  const [archiveQuery, setArchiveQuery] = useState('')
  const [archiveItems, setArchiveItems] = useState([])
  const [archiveResolved, setArchiveResolved] = useState({})
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [customSources, setCustomSources] = useState(getCustomSources())
  const nativeSupported = isNativeOfflineSupported()

  const reloadDownloads = async () => {
    const current = nativeSupported ? await reconcileOfflineDownloads() : getDownloads()
    setDownloads(current)
  }

  const runArchiveSearch = async (query = archiveQuery) => {
    setArchiveLoading(true); setMessage('')
    try {
      const items = await searchOpenMovies(query)
      setArchiveItems(items)
      if (!items.length) setMessage('Nenhum resultado foi encontrado. Tente outro termo.')
    } catch (error) { setMessage(`Falha ao pesquisar no Internet Archive: ${error?.message || 'erro desconhecido'}`) }
    finally { setArchiveLoading(false) }
  }

  useEffect(() => {
    reloadDownloads()
    runArchiveSearch('')
    const reload = () => reloadDownloads()
    const reloadCustom = () => setCustomSources(getCustomSources())
    window.addEventListener('moviebox-storage-changed', reload)
    window.addEventListener('moviebox-custom-sources-changed', reloadCustom)
    return () => { window.removeEventListener('moviebox-storage-changed', reload); window.removeEventListener('moviebox-custom-sources-changed', reloadCustom) }
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all(OFFLINE_CATALOG.map(async (item) => {
      try { const info = await getCommonsMedia(item); if (alive) setMetadata((m) => ({ ...m, [item.id]: info })) }
      catch (error) { if (alive) setMetadata((m) => ({ ...m, [item.id]: { error: true, message: error?.message } })) }
    }))
    return () => { alive = false }
  }, [])

  const resolveArchive = async (item) => {
    setArchiveResolved((r) => ({ ...r, [item.id]: { loading: true } }))
    try { const info = await getArchiveMovie(item); setArchiveResolved((r) => ({ ...r, [item.id]: info })) }
    catch (error) { setArchiveResolved((r) => ({ ...r, [item.id]: { error: true, message: error?.message || 'Falha ao consultar item.' } })) }
  }

  const download = async (item, media, option) => {
    if (!nativeSupported) { setMessage('O download para armazenamento interno funciona no APK Android.'); return }
    setMessage(''); setTasks((t) => ({ ...t, [item.id]: { status: 'downloading', percent: 0, bytes: 0 } }))
    try {
      await downloadOfflineMovie(item, media, option, (progress) => setTasks((t) => ({ ...t, [item.id]: { status: 'downloading', ...progress } })))
      setTasks((t) => ({ ...t, [item.id]: { status: 'done', percent: 100 } }))
      await reloadDownloads(); setTab('downloads')
    } catch (error) { setTasks((t) => ({ ...t, [item.id]: { status: 'error' } })); setMessage(`Falha no download de ${item.title}: ${error?.message || 'erro desconhecido'}`) }
  }

  const play = async (record) => {
    try { const src = await getOfflineMovieSrc(record); setPlayer({ title: record.title, src }) }
    catch (error) { setMessage(`Não foi possível abrir o arquivo: ${error?.message || 'arquivo indisponível'}`); await reloadDownloads() }
  }

  const remove = async (record) => { await deleteOfflineMovie(record); await reloadDownloads() }
  const addSource = (form) => { addCustomSource(form); setCustomSources(getCustomSources()) }
  const removeSource = (id) => { removeCustomSource(id); setCustomSources(getCustomSources()) }

  return (
    <main className="page padded-page offline-page">
      <div className="page-head"><div><span className="eyebrow">MODO OFFLINE · v1.0</span><h1>Downloads e fontes</h1><p className="page-subtitle">Internet Archive, Open Movies e uma área livre para você testar as fontes que escolher.</p></div></div>

      <div className="offline-note legal-note"><strong>O MovieBox não bloqueia downloads com base no campo de licença.</strong><p>Quando a fonte fornece informações de direitos/licença, o aplicativo apenas as exibe. A decisão de usar uma fonte fica com o proprietário do aplicativo.</p></div>
      {!nativeSupported && <div className="offline-note warning-note"><strong>Abra no APK Android para baixar.</strong><p>No navegador é possível pesquisar e cadastrar fontes, mas o armazenamento offline nativo funciona dentro do aplicativo instalado.</p></div>}
      {message && <div className="offline-message">{message}</div>}

      <div className="tabs offline-tabs four-tabs">
        <button className={tab === 'archive' ? 'active' : ''} onClick={() => setTab('archive')}>Internet Archive</button>
        <button className={tab === 'curated' ? 'active' : ''} onClick={() => setTab('curated')}>Open Movies</button>
        <button className={tab === 'custom' ? 'active' : ''} onClick={() => setTab('custom')}>Meus Links</button>
        <button className={tab === 'downloads' ? 'active' : ''} onClick={() => setTab('downloads')}>Baixados ({downloads.length})</button>
      </div>

      {tab === 'archive' && <>
        <form className="archive-search" onSubmit={(e) => { e.preventDefault(); runArchiveSearch() }}><input value={archiveQuery} onChange={(e) => setArchiveQuery(e.target.value)} placeholder="Pesquisar título, assunto..." /><button className="primary" type="submit">Pesquisar</button></form>
        <div className="archive-hint">Resultados de vídeos do Internet Archive. O MovieBox mostra os metadados de direitos quando existirem, mas não exige licença aberta para listar os arquivos disponíveis.</div>
        {archiveLoading ? <div className="full-loader compact-loader"><span className="loader" /><p>Pesquisando Internet Archive…</p></div> : <div className="offline-grid">{archiveItems.map((item) => <ArchiveCard key={item.id} item={item} resolved={archiveResolved[item.id]} downloaded={downloads.find((d) => d.downloadId === item.id)} task={tasks[item.id]} onResolve={resolveArchive} onDownload={download} onPlay={play} onDelete={remove} onMessage={setMessage} />)}</div>}
      </>}

      {tab === 'curated' && <div className="offline-grid">{OFFLINE_CATALOG.map((item) => <CuratedCard key={item.id} item={item} media={metadata[item.id]} downloaded={downloads.find((d) => d.downloadId === item.id)} task={tasks[item.id]} onDownload={download} onPlay={play} onDelete={remove} />)}</div>}

      {tab === 'custom' && <CustomSources sources={customSources} onAdd={addSource} onRemove={removeSource} downloads={downloads} tasks={tasks} onDownload={download} onPlay={play} onDelete={remove} onMessage={setMessage} />}

      {tab === 'downloads' && (!downloads.length ? <div className="empty">Nenhum filme baixado ainda.</div> : <div className="download-library">{downloads.map((item) => <article className="downloaded-card" key={item.downloadId}><div className="downloaded-thumb">{item.thumbUrl ? <img src={item.thumbUrl} alt="" /> : '🎬'}</div><div className="downloaded-info"><span className="eyebrow">DISPONÍVEL OFFLINE</span><h3>{item.title}</h3><p>{item.quality} · {item.license}</p><small>{item.attribution}</small></div><div className="downloaded-actions"><button className="primary" onClick={() => play(item)}>▶ Assistir</button><button className="text-btn" onClick={() => remove(item)}>Excluir</button></div></article>)}</div>)}

      <LocalPlayerModal title={player?.title} src={player?.src} onClose={() => setPlayer(null)} />
    </main>
  )
}
