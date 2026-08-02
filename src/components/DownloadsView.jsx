import { useEffect, useState } from 'react'
import { getDownloads, removeDownload } from '../services/storage'

export default function DownloadsView() {
  const [downloads, setDownloads] = useState([])
  const reload = () => setDownloads(getDownloads())
  useEffect(() => { reload(); window.addEventListener('moviebox-storage-changed', reload); return () => window.removeEventListener('moviebox-storage-changed', reload) }, [])

  return (
    <main className="page padded-page">
      <div className="page-head"><div><span className="eyebrow">MODO OFFLINE</span><h1>Downloads</h1></div></div>
      <div className="offline-note">
        <strong>Área preparada para a etapa nativa</strong>
        <p>O EmbedMovies fornece player por iframe e não expõe um arquivo de download. Nesta área conectaremos arquivos ou URLs diretas de mídia que você tenha autorização para armazenar no aparelho.</p>
      </div>
      {!downloads.length ? <div className="empty">Nenhum conteúdo offline registrado ainda.</div> : (
        <div className="download-list">{downloads.map((item) => <div className="download-item" key={item.downloadId}><div><strong>{item.title}</strong><span>{item.quality || 'Original'} · {item.status || 'Disponível'}</span></div><button className="text-btn" onClick={() => removeDownload(item.downloadId)}>Excluir</button></div>)}</div>
      )}
    </main>
  )
}
