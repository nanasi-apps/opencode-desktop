import { build } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

async function buildAll() {
  await build({ configFile: path.resolve(root, 'vite.main.config.ts') })
  await build({ configFile: path.resolve(root, 'vite.preload.config.ts') })
  await build({ configFile: path.resolve(root, 'vite.renderer.config.ts') })
}

buildAll().catch((err) => {
  console.error(err)
  process.exit(1)
})
