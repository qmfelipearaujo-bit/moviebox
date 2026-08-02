import { Capacitor, registerPlugin, SystemBars } from '@capacitor/core'

const MovieNative = registerPlugin('MovieNative')

export function hasNativeBridge() {
  return Capacitor.getPlatform() === 'android'
}

export async function setNativePlayerMode(active) {
  if (!hasNativeBridge()) return false
  try { await MovieNative.setPlayerMode({ active: !!active }); return true } catch { return false }
}

export async function hideSystemBars() {
  if (!hasNativeBridge()) return false
  const results = await Promise.allSettled([
    SystemBars.hide(),
    MovieNative.hideSystemBars(),
  ])
  return results.some((result) => result.status === 'fulfilled')
}

export async function showSystemBars() {
  if (!hasNativeBridge()) return false
  const results = await Promise.allSettled([
    SystemBars.show(),
    MovieNative.showSystemBars(),
  ])
  return results.some((result) => result.status === 'fulfilled')
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
  try {
    const result = await MovieNative.cancelDownload({ id: Number(id) })
    return result?.cancelled !== false
  } catch {
    return false
  }
}
