import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { getDownloads, registerDownload, removeDownload as removeDownloadMetadata } from './storage'
import { cancelNativeDownload, getNativeDownloadStatus, hasNativeBridge, startNativeDownload } from './nativeBridge'

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

async function downloadWithNativeManager(item, media, option, onProgress, onCancelable) {
  const ext = extensionFor(option)
  const fileName = `${cleanName(item.title || item.id)}-${cleanName(option.quality || 'original')}.${ext}`
  let started = null
  let cancelRequested = false

  // O botão fica ativo imediatamente. Se o usuário tocar antes de o Android devolver
  // o ID da tarefa, a solicitação é lembrada e executada assim que o ID chegar.
  if (onCancelable) {
    onCancelable(async () => {
      cancelRequested = true
      if (started?.id != null) await cancelNativeDownload(started.id)
    })
  }

  started = await startNativeDownload({
    url: option.url,
    fileName,
    headers: {
      'User-Agent': 'MediaBox/1.5 (Android personal media manager)',
      'Accept': 'video/webm,video/mp4,video/ogg,*/*',
    },
  })

  if (cancelRequested) {
    await cancelNativeDownload(started.id).catch(() => {})
    const error = new Error('DOWNLOAD_CANCELLED')
    error.code = 'DOWNLOAD_CANCELLED'
    throw error
  }

  while (true) {
    const state = await getNativeDownloadStatus(started.id)
    const bytes = Number(state.bytes || 0)
    const total = Number(state.total || 0)
    const speedBps = Number(state.speedBps || 0)
    onProgress({ bytes, total, speedBps, percent: total > 0 ? Math.min(100, Math.round((bytes / total) * 100)) : null })

    if (state.status === 'successful') {
      const record = buildRecord(item, media, option, { nativeUri: state.uri || started.uri, nativeDownloadId: started.id })
      registerDownload(record)
      return record
    }
    if (state.status === 'cancelled' || state.status === 'cancelling') {
      const error = new Error('DOWNLOAD_CANCELLED')
      error.code = 'DOWNLOAD_CANCELLED'
      throw error
    }
    if (state.status === 'failed' || state.status === 'missing') {
      throw new Error(`Falha no downloader nativo${state.reason ? ` (${state.reason})` : ''}`)
    }
    await sleep(350)
  }
}

export async function downloadOfflineMovie(item, media, option, onProgress = () => {}, onCancelable = () => {}) {
  if (!isNativeOfflineSupported()) throw new Error('O download offline nativo funciona no APK Android.')
  if (!option?.url) throw new Error('Nenhum arquivo de vídeo disponível para esta qualidade.')
  if (!hasNativeBridge()) throw new Error('Downloader nativo indisponível neste aparelho.')

  try {
    return await downloadWithNativeManager(item, media, option, onProgress, onCancelable)
  } catch (error) {
    if (error?.code === 'DOWNLOAD_CANCELLED' || error?.message === 'DOWNLOAD_CANCELLED') throw error
    throw new Error(`Downloader nativo não respondeu. Gere/instale o APK v1.5 novamente. ${error?.message || ''}`.trim())
  }
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
