import { app, BrowserWindow, Menu, MenuItemConstructorOptions, MessageChannelMain, Notification, Tray, ipcMain, nativeImage, shell, type MessagePortMain } from 'electron'
import { RPCHandler } from '@orpc/server/message-port'
import { onError } from '@orpc/server'
import { router } from './rpc/router.js'
import { startOpencodeWeb, onProcessCrash } from './services/opencode-process.js'
import { onTunnelCrash } from './services/cloudflare-tunnel-process.js'
import { applyLoginItemSettings, readWrapperSettings } from './services/wrapper-settings.js'
import { ensureServiceRunning, getServiceStatus } from './services/launchd-service.js'
import { startUpdateNotifier } from './services/update-notifier.js'
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
const windows = new Set<BrowserWindow>()
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

ipcMain.handle('show-native-notification', (_event, payload: unknown) => {
  if (!Notification.isSupported()) return
  if (typeof payload !== 'object' || payload === null) return

  const data = payload as {
    title?: unknown
    body?: unknown
    subtitle?: unknown
    silent?: unknown
  }

  const title = typeof data.title === 'string' && data.title.trim().length > 0
    ? data.title
    : 'OpenCode'
  const body = typeof data.body === 'string' ? data.body : ''
  const subtitle = typeof data.subtitle === 'string' ? data.subtitle : undefined
  const silent = data.silent === true

  const notification = new Notification({
    title,
    body,
    subtitle,
    silent,
  })
  notification.show()
})

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

function createWindow(isMain = false): BrowserWindow {
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

  // Track all windows
  windows.add(win)

  win.on('close', (event) => {
    if (isQuitting) return
    // Only hide main window, destroy additional windows
    if (isMain && mainWindow === win) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('closed', () => {
    windows.delete(win)
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
    mainWindow = createWindow(true)
    attachCrashEvents(mainWindow)
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.show()
  mainWindow.focus()
}

function createNewWindow(): BrowserWindow {
  const win = createWindow(false)
  return win
}

function attachCrashEvents(win: BrowserWindow): void {
  onProcessCrash(() => {
    if (!win.isDestroyed()) {
      win.webContents.send('opencode-web-crashed')
    }
  })

  onTunnelCrash(() => {
    if (!win.isDestroyed()) {
      win.webContents.send('cloudflare-tunnel-crashed')
    }
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

function setupMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createNewWindow()
          },
        },
        { type: 'separator' },
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle DevTools', accelerator: 'Alt+CmdOrCtrl+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'Ctrl+CmdOrCtrl+F', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Zoom', role: 'zoom' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function cleanupBeforeQuit(): Promise<void> {
  isQuitting = true
  
  // Clean up all windows
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.destroy()
    }
  }
  windows.clear()
  
  // Clean up RPC ports
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

  mainWindow = createWindow(true)
  setupMenu()
  setupTray()
  void applyWrapperStartupSettings()
  startUpdateNotifier()
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
