import { Capacitor, registerPlugin } from '@capacitor/core'

const MovieNative = registerPlugin('MovieNative')

export function hasNativeBridge() {
  return Capacitor.getPlatform() === 'android'
}

export async function hideSystemBars() {
  if (!hasNativeBridge()) return false
  try { await MovieNative.hideSystemBars(); return true } catch { return false }
}

export async function showSystemBars() {
  if (!hasNativeBridge()) return false
  try { await MovieNative.showSystemBars(); return true } catch { return false }
}

export async function startNativeDownload({ url, fileName, headers = {} }) {
  if (!hasNativeBridge()) throw new Error('NATIVE_DOWNLOAD_UNAVAILABLE')
  return MovieNative.startDownload({ url, fileName, headers })
}

export async function getNativeDownloadStatus(id) {
  if (!hasNativeBridge()) throw new Error('NATIVE_DOWNLOAD_UNAVAILABLE')
  return MovieNative.downloadStatus({ id: Number(id) })
}

export async function cancelNativeDownload(id) {
  if (!hasNativeBridge()) return false
  try { await MovieNative.cancelDownload({ id: Number(id) }); return true } catch { return false }
}
