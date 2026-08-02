import { useEffect, useMemo, useState } from 'react'
import { OFFLINE_CATALOG } from '../data/offlineCatalog'
import { formatBytes, getCommonsMedia } from '../services/commons'
import { deleteOfflineMovie, downloadOfflineMovie, getOfflineMovieSrc, isNativeOfflineSupported, reconcileOfflineDownloads } from '../services/offlineDownloads'
import { getDownloads } from '../services/storage'
import LocalPlayerModal from './LocalPlayerModal'

function DownloadCard({ item, media, downloaded, task, onDownload, onPlay, onDelete }) {
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
        <span className="eyebrow">BLENDER OPEN MOVIE · {item.year}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="offline-credit">{item.attribution}</div>

        {downloaded ? (
          <div className="offline-actions">
            <button className="primary" onClick={() => onPlay(downloaded)}>▶ Assistir offline</button>
            <button className="secondary" onClick={() => onDelete(downloaded)}>Excluir</button>
          </div>
        ) : task?.status === 'downloading' ? (
          <div className="download-progress-wrap">
            <div className="download-progress-line"><span>Baixando {task.percent == null ? '' : `${task.percent}%`}</span><strong>{task.bytes ? formatBytes(task.bytes) : ''}</strong></div>
            <div className="download-progress"><span style={{ width: `${task.percent || 4}%` }} /></div>
          </div>
        ) : media?.error ? (
          <div className="offline-error">Não foi possível consultar o arquivo agora. Verifique a internet e tente novamente.</div>
        ) : !media ? (
          <div className="mini-loader">Consultando qualidades…</div>
        ) : (
          <>
            <div className="quality-line">
              <label>Qualidade</label>
              <select value={selected?.quality || ''} onChange={(e) => setQuality(e.target.value)}>
                {options.map((o) => <option key={`${o.quality}-${o.url}`} value={o.quality}>{o.quality}{o.estimatedBytes ? ` · ~${formatBytes(o.estimatedBytes)}` : ''}</option>)}
              </select>
            </div>
            <div className="offline-actions">
              <button className="primary" disabled={!selected} onClick={() => onDownload(item, media, selected)}>⬇ Baixar</button>
              <a className="secondary link-button" href={media.descriptionUrl} target="_blank" rel="noreferrer">Fonte e licença</a>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

export default function DownloadsView() {
  const [tab, setTab] = useState('catalog')
  const [metadata, setMetadata] = useState({})
  const [downloads, setDownloads] = useState([])
  const [tasks, setTasks] = useState({})
  const [player, setPlayer] = useState(null)
  const [message, setMessage] = useState('')
  const nativeSupported = isNativeOfflineSupported()

  const reloadDownloads = async () => {
    const current = nativeSupported ? await reconcileOfflineDownloads() : getDownloads()
    setDownloads(current)
  }

  useEffect(() => {
    reloadDownloads()
    const reload = () => reloadDownloads()
    window.addEventListener('moviebox-storage-changed', reload)
    return () => window.removeEventListener('moviebox-storage-changed', reload)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all(OFFLINE_CATALOG.map(async (item) => {
      try {
        const info = await getCommonsMedia(item)
        if (alive) setMetadata((m) => ({ ...m, [item.id]: info }))
      } catch (error) {
        if (alive) setMetadata((m) => ({ ...m, [item.id]: { error: true, message: error?.message } }))
      }
    }))
    return () => { alive = false }
  }, [])

  const download = async (item, media, option) => {
    if (!nativeSupported) {
      setMessage('O download para armazenamento interno funciona no APK Android. No navegador, use o link da fonte.')
      return
    }
    setMessage('')
    setTasks((t) => ({ ...t, [item.id]: { status: 'downloading', percent: 0, bytes: 0 } }))
    try {
      await downloadOfflineMovie(item, media, option, (progress) => {
        setTasks((t) => ({ ...t, [item.id]: { status: 'downloading', ...progress } }))
      })
      setTasks((t) => ({ ...t, [item.id]: { status: 'done', percent: 100 } }))
      await reloadDownloads()
      setTab('downloads')
    } catch (error) {
      setTasks((t) => ({ ...t, [item.id]: { status: 'error' } }))
      setMessage(`Falha no download de ${item.title}: ${error?.message || 'erro desconhecido'}`)
    }
  }

  const play = async (record) => {
    try {
      const src = await getOfflineMovieSrc(record)
      setPlayer({ title: record.title, src })
    } catch (error) {
      setMessage(`Não foi possível abrir o arquivo: ${error?.message || 'arquivo indisponível'}`)
      await reloadDownloads()
    }
  }

  const remove = async (record) => {
    await deleteOfflineMovie(record)
    await reloadDownloads()
  }

  return (
    <main className="page padded-page offline-page">
      <div className="page-head"><div><span className="eyebrow">MODO OFFLINE</span><h1>Filmes para baixar</h1><p className="page-subtitle">Conteúdo aberto com download autorizado, separado do player EmbedMovies.</p></div></div>

      <div className="offline-note legal-note">
        <strong>Downloads legais e independentes do EmbedMovies</strong>
        <p>Esta seção usa uma lista curada de Blender Open Movies hospedados no Wikimedia Commons. O aplicativo consulta a licença e baixa um transcode oferecido pelo próprio Commons para o armazenamento privado do APK.</p>
      </div>

      {!nativeSupported && <div className="offline-note warning-note"><strong>Abra no APK Android para baixar.</strong><p>No navegador esta página mostra o catálogo e as fontes, mas o armazenamento offline nativo só é habilitado dentro do aplicativo instalado.</p></div>}
      {message && <div className="offline-message">{message}</div>}

      <div className="tabs offline-tabs">
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>Catálogo para baixar</button>
        <button className={tab === 'downloads' ? 'active' : ''} onClick={() => setTab('downloads')}>Meus downloads ({downloads.length})</button>
      </div>

      {tab === 'catalog' ? (
        <div className="offline-grid">
          {OFFLINE_CATALOG.map((item) => (
            <DownloadCard
              key={item.id}
              item={item}
              media={metadata[item.id]}
              downloaded={downloads.find((d) => d.downloadId === item.id)}
              task={tasks[item.id]}
              onDownload={download}
              onPlay={play}
              onDelete={remove}
            />
          ))}
        </div>
      ) : !downloads.length ? (
        <div className="empty">Nenhum filme baixado ainda. Escolha um título no catálogo acima.</div>
      ) : (
        <div className="download-library">
          {downloads.map((item) => (
            <article className="downloaded-card" key={item.downloadId}>
              <div className="downloaded-thumb">{item.thumbUrl ? <img src={item.thumbUrl} alt="" /> : '🎬'}</div>
              <div className="downloaded-info"><span className="eyebrow">DISPONÍVEL OFFLINE</span><h3>{item.title}</h3><p>{item.quality} · {item.license}</p><small>{item.attribution}</small></div>
              <div className="downloaded-actions"><button className="primary" onClick={() => play(item)}>▶ Assistir</button><button className="text-btn" onClick={() => remove(item)}>Excluir</button></div>
            </article>
          ))}
        </div>
      )}

      <LocalPlayerModal title={player?.title} src={player?.src} onClose={() => setPlayer(null)} />
    </main>
  )
}
