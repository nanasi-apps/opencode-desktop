const { ipcRenderer } = require('electron') as typeof import('electron')

const windowLoaded = new Promise<void>(resolve => {
  window.onload = () => resolve()
})

ipcRenderer.on('orpc-port', async (event) => {
  await windowLoaded
  window.postMessage('orpc-port', '*', event.ports as unknown as MessagePort[])
})

ipcRenderer.on('opencode-web-crashed', () => {
  window.dispatchEvent(new CustomEvent('opencode-web-crashed'))
})

window.addEventListener('opencode-native-notification', (event: Event) => {
  const customEvent = event as CustomEvent<unknown>
  void ipcRenderer.invoke('show-native-notification', customEvent.detail)
})
