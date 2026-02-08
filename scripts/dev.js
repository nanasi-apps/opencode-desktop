import { build, createServer } from 'vite'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import electron from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

async function buildMainAndPreload() {
  await build({
    configFile: path.resolve(root, 'vite.main.config.ts'),
    mode: 'development',
    build: { watch: {} },
  })
  await build({
    configFile: path.resolve(root, 'vite.preload.config.ts'),
    mode: 'development',
    build: { watch: {} },
  })
}

async function startRendererDevServer() {
  const server = await createServer({
    configFile: path.resolve(root, 'vite.renderer.config.ts'),
    mode: 'development',
  })
  await server.listen()
  const address = server.httpServer?.address()
  const port = typeof address === 'object' && address ? address.port : 5173
  return { server, url: `http://localhost:${port}` }
}

function spawnElectron(devServerUrl, onClose) {
  const electronPath = typeof electron === 'string' ? electron : electron.toString()
  const child = spawn(electronPath, [path.resolve(root, 'dist/main/index.js')], {
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: devServerUrl },
  })
  child.on('close', onClose)
  return child
}

async function startDev() {
  await buildMainAndPreload()
  const { server, url } = await startRendererDevServer()
  console.log(`Renderer dev server: ${url}`)
  spawnElectron(url, () => {
    server.close()
    process.exit()
  })
}

startDev().catch((err) => {
  console.error(err)
  process.exit(1)
})
