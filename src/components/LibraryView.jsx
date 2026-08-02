import { useEffect, useState } from 'react'
import { clearHistory, getFavorites, getHistory } from '../services/storage'
import MediaCard from './MediaCard'

export default function LibraryView({ onOpen }) {
  const [tab, setTab] = useState('favorites')
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])

  const reload = () => { setFavorites(getFavorites()); setHistory(getHistory()) }
  useEffect(() => { reload(); window.addEventListener('moviebox-storage-changed', reload); return () => window.removeEventListener('moviebox-storage-changed', reload) }, [])
  const items = tab === 'favorites' ? favorites : history

  return (
    <main className="page padded-page">
      <div className="page-head"><div><span className="eyebrow">SUA BIBLIOTECA</span><h1>Minha lista</h1></div>{tab === 'history' && history.length > 0 ? <button className="text-btn" onClick={clearHistory}>Limpar histórico</button> : null}</div>
      <div className="tabs"><button className={tab === 'favorites' ? 'active' : ''} onClick={() => setTab('favorites')}>Favoritos</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Histórico</button></div>
      {!items.length ? <div className="empty">{tab === 'favorites' ? 'Seus filmes e séries favoritos aparecerão aqui.' : 'O que você assistir aparecerá aqui.'}</div> : <div className="media-grid">{items.map((item) => <MediaCard key={`${item.media_type}-${item.id}`} item={item} onOpen={onOpen} />)}</div>}
    </main>
  )
}
