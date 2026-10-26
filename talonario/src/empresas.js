import initialCompanies from './empresas.json'
import { loadClient } from './data.js'

let companies = []

const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : '' }

function renderSelect(selectedName) {
  const sel = document.getElementById('d-empresa-select')
  if (!sel) return
  sel.innerHTML = '<option value="">— Selecciona una empresa —</option>'
  companies.forEach((c, i) => {
    const o = document.createElement('option')
    o.value = String(i)
    o.textContent = c.nombre || ('Empresa ' + (i + 1))
    sel.appendChild(o)
  })
  if (selectedName != null) {
    const idx = companies.findIndex((c) => (c.nombre || '') === selectedName)
    if (idx >= 0) sel.value = String(idx)
  }
}

async function saveEmpresa() {
  const msg = document.getElementById('d-empresa-msg')
  const c = {
    nombre: val('d-nombre'),
    domicilio: val('d-domicilio'),
    rif: val('d-rif'),
    telefono: val('d-telefono')
  }

  if (!c.nombre) {
    if (msg) msg.textContent = 'Escribe al menos el Nombre o Razón Social.'
    return
  }

  // Upsert por nombre: si ya existe, se actualiza; si no, se agrega.
  const idx = companies.findIndex(
    (x) => (x.nombre || '').trim().toLowerCase() === c.nombre.toLowerCase()
  )
  if (idx >= 0) companies[idx] = c
  else companies.push(c)

  try {
    const res = await fetch('/__save-empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companies, null, 2)
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    renderSelect(c.nombre)
    if (msg) msg.textContent = '✓ Empresa guardada en src/empresas.json'
  } catch (e) {
    if (msg) msg.textContent = 'No se pudo guardar (¿vite dev corriendo?). ' + e.message
  }
}

export function initEmpresas() {
  companies = Array.isArray(initialCompanies) ? initialCompanies.slice() : []
  renderSelect()

  const sel = document.getElementById('d-empresa-select')
  if (sel) {
    sel.addEventListener('change', () => {
      const i = sel.value === '' ? -1 : parseInt(sel.value, 10)
      if (i >= 0 && companies[i]) loadClient(companies[i])
    })
  }

  const btn = document.getElementById('d-empresa-save')
  if (btn) btn.addEventListener('click', saveEmpresa)
}
