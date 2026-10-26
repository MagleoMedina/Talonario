import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync } from 'node:fs'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const CAL_PATH = resolve(projectRoot, 'src/calibration.json')
const EMP_PATH = resolve(projectRoot, 'src/empresas.json')

const norm = (p) => p.replace(/\\/g, '/')

// Endpoint POST (solo dev) -> archivo JSON en disco.
const ENDPOINTS = {
  '/__save-calibration': CAL_PATH,
  '/__save-empresas': EMP_PATH
}

function talonarioFiles() {
  // Rutas ya escritas por nosotros: se evita el reload automático de Vite.
  const justSaved = new Set()

  return {
    name: 'talonario-files',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        const target = ENDPOINTS[url]
        if (!target) return next()

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }))
          return
        }

        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            writeFileSync(target, JSON.stringify(data, null, 2) + '\n', 'utf8')
            justSaved.add(norm(target))
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })
      })
    },

    handleHotUpdate({ file }) {
      // Guardado propio desde el navegador: el estado ya vive en memoria.
      // Un cambio externo (editor) deja el default de Vite (full reload).
      const key = norm(file)
      if (justSaved.has(key)) {
        justSaved.delete(key)
        return []
      }
    }
  }
}

export default defineConfig({
  plugins: [talonarioFiles()]
})
