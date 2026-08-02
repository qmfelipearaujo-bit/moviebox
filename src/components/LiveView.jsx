import { useEffect, useMemo, useRef, useState } from 'react'
import { RADIO_COUNTRIES, getRadiosByCountry } from '../services/radioBrowser'
import { STARTER_TV, addCustomTv, detectTvType, getCustomTv, removeCustomTv } from '../services/liveSources'
import LivePlayerModal from './LivePlayerModal'

function TvCard({ channel, onPlay, onRemove }) {
  return (
    <article className="live-card tv-card">
      <div className="live-card-icon">{channel.flag || '📺'}</div>
      <div className="live-card-copy">
        <span className="eyebrow">{channel.country || 'CANAL PERSONALIZADO'}</span>
        <h3>{channel.name}</h3>
        <p>{channel.note || channel.url}</p>
      </div>
      <div className="live-card-actions">
        {channel.type === 'external' ? <a className="primary link-button" href={channel.url} target="_blank" rel="noreferrer">Abrir ao vivo</a> : <button className="primary" onClick={() => onPlay(channel)}>▶ Assistir</button>}
        {channel.homepage && channel.type !== 'external' ? <a className="secondary link-button" href={channel.homepage} target="_blank" rel="noreferrer">Site oficial</a> : null}
        {channel.custom ? <button className="text-btn danger" onClick={() => onRemove(channel.id)}>Remover</button> : null}
      </div>
    </article>
  )
}

function RadioPanel() {
  const [country, setCountry] = useState('BR')
  const [search, setSearch] = useState('')
  const [radios, setRadios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    getRadiosByCountry(country).then((rows) => alive && setRadios(rows)).catch(() => alive && setError('Não foi possível consultar as rádios agora.')).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [country])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return radios
    return radios.filter((x) => `${x.name} ${x.tags} ${x.state}`.toLowerCase().includes(q))
  }, [radios, search])

  const play = async (station) => {
    setPlaying(station)
    setTimeout(() => audioRef.current?.play().catch(() => {}), 30)
  }

  return (
    <div className="radio-panel">
      <div className="radio-toolbar">
        <div className="country-pills">{RADIO_COUNTRIES.map((x) => <button key={x.code} className={country === x.code ? 'active' : ''} onClick={() => setCountry(x.code)}>{x.flag} {x.label}</button>)}</div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar rádio, cidade ou gênero…" />
      </div>
      {playing && <div className="radio-now"><div className="radio-now-icon">{playing.favicon ? <img src={playing.favicon} alt="" onError={(e) => { e.currentTarget.style.display='none' }} /> : '📻'}</div><div><span className="eyebrow">TOCANDO AGORA</span><strong>{playing.name}</strong><small>{playing.state || playing.country}{playing.bitrate ? ` · ${playing.bitrate} kbps` : ''}</small></div><audio ref={audioRef} src={playing.url} controls autoPlay /></div>}
      {loading ? <div className="full-loader compact-loader"><span className="loader" /><p>Carregando rádios…</p></div> : error ? <div className="empty">{error}</div> : <div className="radio-grid">{filtered.map((station) => <button className={`radio-card ${playing?.id === station.id ? 'playing' : ''}`} key={station.id} onClick={() => play(station)}><div className="radio-logo">{station.favicon ? <img src={station.favicon} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display='none' }} /> : '📻'}</div><div><strong>{station.name}</strong><span>{station.state || station.country}</span><small>{station.codec}{station.bitrate ? ` · ${station.bitrate} kbps` : ''}</small></div><b>▶</b></button>)}</div>}
    </div>
  )
}

export default function LiveView() {
  const [tab, setTab] = useState('tv')
  const [player, setPlayer] = useState(null)
  const [custom, setCustom] = useState(getCustomTv())
  const [form, setForm] = useState({ name: '', url: '', country: '' })

  useEffect(() => {
    const reload = () => setCustom(getCustomTv())
    window.addEventListener('moviebox-live-changed', reload)
    return () => window.removeEventListener('moviebox-live-changed', reload)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const name = form.name.trim(); const url = form.url.trim()
    if (!name || !/^https?:\/\//i.test(url)) return
    addCustomTv({ name, url, country: form.country.trim() || 'Personalizado', type: detectTvType(url), note: 'Canal adicionado por você.', custom: true })
    setForm({ name: '', url: '', country: '' })
  }

  return (
    <main className="page padded-page live-page">
      <div className="page-head"><div><span className="eyebrow">AO VIVO</span><h1>TV e rádios</h1><p className="page-subtitle">Canais oficiais selecionados, seus próprios links e rádios online por país.</p></div></div>
      <div className="tabs live-tabs"><button className={tab === 'tv' ? 'active' : ''} onClick={() => setTab('tv')}>📺 TV ao vivo</button><button className={tab === 'radio' ? 'active' : ''} onClick={() => setTab('radio')}>📻 Rádios</button></div>
      {tab === 'tv' ? <>
        <div className="live-grid">{[...STARTER_TV, ...custom].map((channel) => <TvCard key={channel.id} channel={channel} onPlay={setPlayer} onRemove={removeCustomTv} />)}</div>
        <form className="custom-tv-form" onSubmit={submit}><div><span className="eyebrow">SEU CANAL</span><h2>Adicionar TV ao vivo</h2><p>Você pode cadastrar uma URL de embed, HLS (.m3u8) ou vídeo direto.</p></div><input value={form.name} onChange={(e) => setForm((x) => ({...x,name:e.target.value}))} placeholder="Nome do canal" /><input value={form.country} onChange={(e) => setForm((x) => ({...x,country:e.target.value}))} placeholder="País (opcional)" /><input value={form.url} onChange={(e) => setForm((x) => ({...x,url:e.target.value}))} placeholder="https://…" /><button className="primary" type="submit">Adicionar canal</button></form>
      </> : <RadioPanel />}
      <LivePlayerModal channel={player} onClose={() => setPlayer(null)} />
    </main>
  )
}
