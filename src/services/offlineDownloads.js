import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { FileTransfer } from '@capacitor/file-transfer'
import { getDownloads, registerDownload, removeDownload as removeDownloadMetadata } from './storage'
import { cancelNativeDownload, getNativeDownloadStatus, hasNativeBridge, startNativeDownload } from './nativeBridge'

const DOWNLOAD_DIR = 'moviebox-offline'

export function isNativeOfflineSupported() {
  return Capacitor.isNativePlatform()
}

function cleanName(value) {
  return String(value || 'movie').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function extensionFor(option) {
  const byMime = String(option?.mime || '').toLowerCase()
  if (byMime.includes('mp4')) return 'mp4'
  if (byMime.includes('ogg') || byMime.includes('ogv')) return 'ogv'
  const match = String(option?.url || '').match(/\.(webm|mp4|m4v|ogv)(?:\?|$)/i)
  return match?.[1]?.toLowerCase() || 'mp4'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function buildRecord(item, media, option, extra = {}) {
  return {
    downloadId: item.id,
    title: item.title,
    year: item.year,
    quality: option.quality,
    status: 'Disponível offline',
    mime: option.mime,
    sourceUrl: media.descriptionUrl || media.sourceUrl || option.url,
    license: media.license || item.license || item.expectedLicense || 'Direitos não informados',
    attribution: item.attribution || media.creator || item.creator || '',
    thumbUrl: media.thumbUrl || item.thumbUrl || item.poster || '',
    savedAt: Date.now(),
    ...extra,
  }
}

async function downloadWithAndroidManager(item, media, option, onProgress, onCancelable) {
  const ext = extensionFor(option)
  const fileName = `${cleanName(item.title || item.id)}-${cleanName(option.quality || 'original')}.${ext}`
  const started = await startNativeDownload({
    url: option.url,
    fileName,
    headers: {
      'User-Agent': 'MovieBoxPrivate/1.4 (Android personal media manager)',
      'Accept': 'video/webm,video/mp4,video/ogg,*/*',
    },
  })
  let cancelled = false
  let lastBytes = 0
  let lastAt = Date.now()
  if (onCancelable) onCancelable(async () => {
    cancelled = true
    await cancelNativeDownload(started.id)
  })

  while (true) {
    if (cancelled) {
      const error = new Error('DOWNLOAD_CANCELLED')
      error.code = 'DOWNLOAD_CANCELLED'
      throw error
    }
    const state = await getNativeDownloadStatus(started.id)
    const bytes = Number(state.bytes || 0)
    const total = Number(state.total || 0)
    const now = Date.now()
    const speedBps = now > lastAt ? Math.max(0, ((bytes - lastBytes) * 1000) / (now - lastAt)) : 0
    lastBytes = bytes; lastAt = now
    onProgress({ bytes, total, speedBps, percent: total > 0 ? Math.min(100, Math.round((bytes / total) * 100)) : null })
    if (state.status === 'successful') {
      const record = buildRecord(item, media, option, { nativeUri: state.uri || started.uri, nativeDownloadId: started.id })
      registerDownload(record)
      return record
    }
    if (state.status === 'failed' || state.status === 'missing') {
      throw new Error(`Falha no DownloadManager${state.reason ? ` (${state.reason})` : ''}`)
    }
    await sleep(650)
  }
}

async function downloadWithFileTransfer(item, media, option, onProgress, onCancelable) {
  await Filesystem.mkdir({ directory: Directory.Data, path: DOWNLOAD_DIR, recursive: true }).catch(() => {})
  const ext = extensionFor(option)
  const qualityKey = cleanName(option.quality || 'video')
  const path = `${DOWNLOAD_DIR}/${cleanName(item.id)}-${qualityKey}.${ext}`
  const fileInfo = await Filesystem.getUri({ directory: Directory.Data, path })
  let listener
  let lastBytes = 0
  let lastAt = Date.now()
  if (onCancelable) onCancelable(null)
  try {
    listener = await FileTransfer.addListener('progress', (progress) => {
      const total = Number(progress.contentLength || 0)
      const bytes = Number(progress.bytes || 0)
      const now = Date.now()
      const speedBps = now > lastAt ? Math.max(0, ((bytes - lastBytes) * 1000) / (now - lastAt)) : 0
      lastBytes = bytes; lastAt = now
      onProgress({ bytes, total, speedBps, percent: total ? Math.min(100, Math.round((bytes / total) * 100)) : null })
    })
    await FileTransfer.downloadFile({
      url: option.url,
      path: fileInfo.uri,
      progress: true,
      headers: {
        'User-Agent': 'MovieBoxPrivate/1.4 (personal Android app; user-selected media download)',
        'Accept': 'video/webm,video/mp4,video/ogg,*/*',
      },
    })
  } catch (error) {
    await Filesystem.deleteFile({ directory: Directory.Data, path }).catch(() => {})
    throw error
  } finally {
    if (listener) await listener.remove().catch(() => {})
  }
  const record = buildRecord(item, media, option, { localPath: path })
  registerDownload(record)
  return record
}

export async function downloadOfflineMovie(item, media, option, onProgress = () => {}, onCancelable = () => {}) {
  if (!isNativeOfflineSupported()) throw new Error('O download offline nativo funciona no APK Android.')
  if (!option?.url) throw new Error('Nenhum arquivo de vídeo disponível para esta qualidade.')
  if (hasNativeBridge()) {
    try { return await downloadWithAndroidManager(item, media, option, onProgress, onCancelable) }
    catch (error) {
      if (error?.code === 'DOWNLOAD_CANCELLED' || error?.message === 'DOWNLOAD_CANCELLED') throw error
      console.warn('DownloadManager indisponível; usando FileTransfer.', error)
    }
  }
  return downloadWithFileTransfer(item, media, option, onProgress, onCancelable)
}

export async function getOfflineMovieSrc(record) {
  if (record?.nativeUri) return Capacitor.convertFileSrc(record.nativeUri)
  if (!record?.localPath) throw new Error('Arquivo local não encontrado.')
  const fileInfo = await Filesystem.getUri({ directory: Directory.Data, path: record.localPath })
  return Capacitor.convertFileSrc(fileInfo.uri)
}

export async function deleteOfflineMovie(record) {
  if (record?.nativeDownloadId) {
    await cancelNativeDownload(record.nativeDownloadId).catch(() => {})
  } else if (record?.localPath) {
    await Filesystem.deleteFile({ directory: Directory.Data, path: record.localPath }).catch(() => {})
  }
  removeDownloadMetadata(record.downloadId)
}

export async function reconcileOfflineDownloads() {
  const items = getDownloads()
  if (!isNativeOfflineSupported()) return items
  const valid = []
  for (const item of items) {
    if (item.nativeUri) { valid.push(item); continue }
    if (!item.localPath) continue
    try {
      await Filesystem.stat({ directory: Directory.Data, path: item.localPath })
      valid.push(item)
    } catch {
      removeDownloadMetadata(item.downloadId)
    }
  }
  return valid
}
