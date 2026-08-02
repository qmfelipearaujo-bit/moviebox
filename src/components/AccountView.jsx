import { useEffect, useState } from 'react'
import { clearCloudConfig, getCloudConfig, getCloudSession, isCloudConfigured, pullCloudLibrary, pushCloudLibrary, setCloudConfig, signIn, signOut, signUp } from '../services/cloudAccount'

export default function AccountView() {
  const [config, setConfig] = useState(getCloudConfig())
  const [session, setSession] = useState(getCloudSession())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const reload = () => { setConfig(getCloudConfig()); setSession(getCloudSession()) }
    window.addEventListener('moviebox-account-changed', reload)
    return () => window.removeEventListener('moviebox-account-changed', reload)
  }, [])

  const saveConfig = () => {
    setCloudConfig(config)
    setMessage('Configuração de nuvem salva neste aparelho.')
  }
  const run = async (fn) => {
    setBusy(true); setMessage('')
    try { const msg = await fn(); if (msg) setMessage(msg); setSession(getCloudSession()) }
    catch (e) { setMessage(`Erro: ${e?.message || 'falha desconhecida'}`) }
    finally { setBusy(false) }
  }

  return (
    <main className="page padded-page account-page">
      <div className="page-head"><div><span className="eyebrow">CONTA E NUVEM</span><h1>Seu Media Box em qualquer aparelho</h1><p className="page-subtitle">Com uma conta gratuita Supabase, favoritos e histórico podem voltar mesmo depois de reinstalar o app.</p></div></div>

      {!isCloudConfigured() ? <section className="account-card">
        <span className="eyebrow">CONFIGURAÇÃO DO PROPRIETÁRIO</span><h2>Conectar Supabase</h2><p>Crie um projeto gratuito no Supabase e cole aqui o Project URL e a chave pública/anon. Depois execute o SQL incluído no arquivo <b>SUPABASE_LOGIN.txt</b>.</p>
        <label>Project URL<input value={config.url || ''} onChange={(e) => setConfig((x) => ({...x,url:e.target.value}))} placeholder="https://xxxx.supabase.co" /></label>
        <label>Publishable / anon key<input type="password" value={config.key || ''} onChange={(e) => setConfig((x) => ({...x,key:e.target.value}))} placeholder="sb_publishable_… ou eyJ…" /></label>
        <button className="primary" onClick={saveConfig}>Salvar configuração</button>
      </section> : session?.access_token ? <section className="account-card account-signed">
        <div className="account-avatar">👤</div><div><span className="eyebrow">CONECTADO</span><h2>{session.user?.email || 'Conta Media Box'}</h2><p>Favoritos e histórico são sincronizados automaticamente. Downloads permanecem somente no aparelho.</p></div>
        <div className="account-actions"><button className="secondary" disabled={busy} onClick={() => run(async () => { await pullCloudLibrary(false); return 'Dados restaurados da nuvem.' })}>↓ Restaurar da nuvem</button><button className="secondary" disabled={busy} onClick={() => run(async () => { await pushCloudLibrary(); return 'Dados enviados para a nuvem.' })}>↑ Enviar agora</button><button className="text-btn" onClick={() => { signOut(); setSession(null); setMessage('Sessão encerrada.') }}>Sair</button></div>
      </section> : <section className="account-card">
        <span className="eyebrow">LOGIN</span><h2>Entrar ou criar conta</h2><p>Use o mesmo e-mail em outro aparelho para recuperar favoritos e histórico.</p>
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" /></label>
        <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo recomendado: 8 caracteres" /></label>
        <div className="account-actions"><button className="primary" disabled={busy || !email || password.length < 6} onClick={() => run(async () => { await signIn(email,password); return 'Login realizado e biblioteca sincronizada.' })}>Entrar</button><button className="secondary" disabled={busy || !email || password.length < 6} onClick={() => run(async () => { const r = await signUp(email,password); return r.needsConfirmation ? 'Conta criada. Confira seu e-mail para confirmar o cadastro.' : 'Conta criada e conectada.' })}>Criar conta</button></div>
        <button className="text-btn danger" onClick={() => { clearCloudConfig(); setConfig({url:'',key:''}); setMessage('Configuração de nuvem removida deste aparelho.') }}>Trocar configuração Supabase</button>
      </section>}
      {message && <div className="offline-message account-message">{message}</div>}
      <div className="account-note"><strong>O que fica na nuvem?</strong><p>Favoritos e histórico. O token TMDB, links personalizados e arquivos baixados continuam locais no aparelho.</p></div>
    </main>
  )
}
