import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: 'src/main/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        /^@orpc\//,
        'zod',
      ],
    },
    minify: false,
    emptyOutDir: true,
  },
})
