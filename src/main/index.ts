import { app, BrowserWindow, Menu, MessageChannelMain, Tray, nativeImage, shell, type MessagePortMain } from 'electron'
import { RPCHandler } from '@orpc/server/message-port'
import { onError } from '@orpc/server'
import { router } from './rpc/router.js'
import { startOpencodeWeb, onProcessCrash } from './services/opencode-process.js'
import { onTunnelCrash } from './services/cloudflare-tunnel-process.js'
import { applyLoginItemSettings, readWrapperSettings } from './services/wrapper-settings.js'
import { ensureServiceRunning, getServiceStatus } from './services/launchd-service.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !!process.env.VITE_DEV_SERVER_URL
const APP_NAME = 'OpenCode Desktop'

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error('[oRPC Error]', error)
    }),
  ],
})

const activePorts = new Map<number, MessagePortMain>()
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function isLocalAppUrl(rawUrl: string): boolean {
  try {
    const parsedUrl = new URL(rawUrl)
    if (parsedUrl.protocol === 'file:') return true
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return false
    return parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function openInDefaultBrowserIfExternal(rawUrl: string): boolean {
  try {
    const parsedUrl = new URL(rawUrl)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return false
    if (isLocalAppUrl(rawUrl)) return false
    void shell.openExternal(rawUrl)
    return true
  } catch {
    return false
  }
}

const TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5WwKQAAAAASUVORK5CYII='

function setupOrpcChannel(win: BrowserWindow) {
  const { port1, port2 } = new MessageChannelMain()

  // port1 → oRPC server handler
  const webContentsId = win.webContents.id
  const oldPort = activePorts.get(webContentsId)
  if (oldPort) {
    oldPort.close()
  }
  activePorts.set(webContentsId, port1)
  handler.upgrade(port1)
  port1.start()

  // port2 → renderer (via preload bridge)
  win.webContents.postMessage('orpc-port', null, [port2])
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    minWidth: 1280,
    height: 800,
    title: 'OpenCode Desktop',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/index'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    win.hide()
  })

  win.webContents.on('destroyed', () => {
    const port = activePorts.get(win.webContents.id)
    if (port) {
      port.close()
      activePorts.delete(win.webContents.id)
    }
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!)
    win.webContents.on('did-finish-load', () => {
      setupOrpcChannel(win)
    })
  } else {
    win.loadFile(path.resolve(__dirname, '../renderer/index.html'))
    win.webContents.on('did-finish-load', () => {
      setupOrpcChannel(win)
    })
  }

  return win
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow()
    attachCrashEvents(mainWindow)
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.show()
  mainWindow.focus()
}

function attachCrashEvents(win: BrowserWindow): void {
  onProcessCrash(() => {
    win.webContents.send('opencode-web-crashed')
  })

  onTunnelCrash(() => {
    win.webContents.send('cloudflare-tunnel-crashed')
    void startBackgroundTunnelIfEnabled()
  })
}

function setupTray(): void {
  if (tray) return

  const icon = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL)
  tray = new Tray(icon)
  tray.setToolTip('OpenCode Desktop')
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show OpenCode Desktop',
      click: () => {
        showMainWindow()
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ]))

  tray.on('click', () => {
    showMainWindow()
  })
}

async function cleanupBeforeQuit(): Promise<void> {
  for (const port of activePorts.values()) {
    port.close()
  }
  activePorts.clear()
}

async function startBackgroundTunnelIfEnabled(): Promise<void> {
  try {
    const settings = await readWrapperSettings()
    if (settings.tunnel.enabled) {
      await startOpencodeWeb()
    }
  } catch (err) {
    console.error('[background tunnel] failed to start', err)
  }
}

async function applyWrapperStartupSettings(): Promise<void> {
  try {
    const settings = await readWrapperSettings()
    applyLoginItemSettings(settings.launchAtLogin)

    const serviceStatus = await getServiceStatus()
    if (serviceStatus !== 'not_installed') {
      await ensureServiceRunning(settings)
    }
  } catch (err) {
    console.error('[wrapper startup settings] failed to apply', err)
  }
}

app.whenReady().then(() => {
  app.setName(APP_NAME)
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
  })

  mainWindow = createWindow()
  setupTray()
  void applyWrapperStartupSettings()
  attachCrashEvents(mainWindow)

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (openInDefaultBrowserIfExternal(url)) {
        return { action: 'deny' }
      }
      return { action: 'allow' }
    })

    contents.on('will-navigate', (event, url) => {
      if (openInDefaultBrowserIfExternal(url)) {
        event.preventDefault()
      }
    })
  })

  app.on('activate', () => {
    showMainWindow()
  })
})

app.on('window-all-closed', () => {
  // Keep background services alive in tray mode.
})

app.on('before-quit', () => {
  isQuitting = true
  cleanupBeforeQuit()
})
