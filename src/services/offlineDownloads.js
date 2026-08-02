import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { FileTransfer } from '@capacitor/file-transfer'
import { getDownloads, registerDownload, removeDownload as removeDownloadMetadata } from './storage'

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
  return match?.[1]?.toLowerCase() || 'webm'
}

export async function downloadOfflineMovie(item, media, option, onProgress = () => {}) {
  if (!isNativeOfflineSupported()) throw new Error('O download offline nativo funciona no APK Android.')
  if (!option?.url) throw new Error('Nenhum arquivo de vídeo disponível para esta qualidade.')

  await Filesystem.mkdir({ directory: Directory.Data, path: DOWNLOAD_DIR, recursive: true }).catch(() => {})
  const ext = extensionFor(option)
  const qualityKey = cleanName(option.quality || 'video')
  const path = `${DOWNLOAD_DIR}/${cleanName(item.id)}-${qualityKey}.${ext}`
  const fileInfo = await Filesystem.getUri({ directory: Directory.Data, path })

  let listener
  try {
    listener = await FileTransfer.addListener('progress', (progress) => {
      const total = Number(progress.contentLength || 0)
      const bytes = Number(progress.bytes || 0)
      onProgress({ bytes, total, percent: total ? Math.min(100, Math.round((bytes / total) * 100)) : null })
    })
    await FileTransfer.downloadFile({
      url: option.url,
      path: fileInfo.uri,
      progress: true,
      headers: {
        'User-Agent': 'MovieBoxPrivate/1.1 (personal Android app; user-selected media download)',
        'Accept': 'video/webm,video/mp4,video/ogg,*/*',
      },
    })
  } catch (error) {
    await Filesystem.deleteFile({ directory: Directory.Data, path }).catch(() => {})
    throw error
  } finally {
    if (listener) await listener.remove().catch(() => {})
  }

  const record = {
    downloadId: item.id,
    title: item.title,
    year: item.year,
    quality: option.quality,
    status: 'Disponível offline',
    localPath: path,
    mime: option.mime,
    sourceUrl: media.descriptionUrl || media.sourceUrl || option.url,
    license: media.license || item.license || item.expectedLicense || 'Direitos não informados',
    attribution: item.attribution || media.creator || item.creator || '',
    thumbUrl: media.thumbUrl || item.thumbUrl || item.poster || '',
    savedAt: Date.now(),
  }
  registerDownload(record)
  return record
}

export async function getOfflineMovieSrc(record) {
  if (!record?.localPath) throw new Error('Arquivo local não encontrado.')
  const fileInfo = await Filesystem.getUri({ directory: Directory.Data, path: record.localPath })
  return Capacitor.convertFileSrc(fileInfo.uri)
}

export async function deleteOfflineMovie(record) {
  if (record?.localPath) {
    await Filesystem.deleteFile({ directory: Directory.Data, path: record.localPath }).catch(() => {})
  }
  removeDownloadMetadata(record.downloadId)
}

export async function reconcileOfflineDownloads() {
  const items = getDownloads()
  if (!isNativeOfflineSupported()) return items
  const valid = []
  for (const item of items) {
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
