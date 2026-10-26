import initialCal from './calibration.json'

// Bloques: se mueven como un conjunto
const BLOCKS = [
  { id: 'emision',   label: 'Fecha / Factura N°' },
  { id: 'cliente',   label: 'Datos del Cliente' },
  { id: 'renglon',   label: 'Columna RENGLÓN' },
  { id: 'desc',      label: 'Columna DESCRIPCIÓN' },
  { id: 'cant',      label: 'Columna CANTIDAD' },
  { id: 'precio',    label: 'Columna PRECIO UNITARIO' },
  { id: 'exento',    label: 'Columna (E) EXENTO' },
  { id: 'monto',     label: 'Columna MONTO' }
]

// Items: se mueven uno por uno
const ITEMS = [
  { id: 'pago-efectivo',      label: 'Efectivo',         group: 'Forma de Pago', target: '[data-cal="pago-efectivo"] .checkbox-sq .print-data' },
  { id: 'pago-debito',        label: 'Tarj. de Débito',  group: 'Forma de Pago', target: '[data-cal="pago-debito"] .checkbox-sq .print-data' },
  { id: 'pago-credito',       label: 'Tarj. de Crédito', group: 'Forma de Pago', target: '[data-cal="pago-credito"] .checkbox-sq .print-data' },
  { id: 'pago-transferencia', label: 'Transferencia',    group: 'Forma de Pago', target: '[data-cal="pago-transferencia"] .line-fill' },
  { id: 'pago-movil',         label: 'Pago móvil',       group: 'Forma de Pago', target: '[data-cal="pago-movil"] .line-fill' },
  { id: 'pago-banco',         label: 'Banco',            group: 'Forma de Pago', target: '[data-cal="pago-banco"] .line-fill' },
  { id: 'bcv-tasa',           label: 'Tasa de cambio',   group: 'Ley IVA / BCV', target: '[data-cal="bcv-tasa"]' },
  { id: 'bcv-divisas',        label: 'Monto en divisas', group: 'Ley IVA / BCV', target: '[data-cal="bcv-divisas"]' },
  { id: 'tot-iva-pct',        label: 'I.V.A. %',         group: 'Totales', target: '[data-cal="tot-iva-pct"]' },
  { id: 'tot-iva-base',       label: 'I.V.A. sobre Bs.', group: 'Totales', target: '[data-cal="tot-iva-base"]' },
  { id: 'tot-igtf-base',      label: 'Base IGTF (3%)',   group: 'Totales', target: '[data-cal="tot-igtf-base"]' },
  { id: 'tot-base',           label: 'BASE Bs.',         group: 'Totales', target: '[data-cal="tot-base"]' },
  { id: 'tot-otros',          label: 'OTROS Bs.',        group: 'Totales', target: '[data-cal="tot-otros"]' },
  { id: 'tot-iva',            label: 'I.V.A. Bs.',       group: 'Totales', target: '[data-cal="tot-iva"]' },
  { id: 'tot-igtf',           label: 'IGTF Bs.',         group: 'Totales', target: '[data-cal="tot-igtf"]' },
  { id: 'tot-total',          label: 'TOTAL A PAGAR',    group: 'Totales', target: '[data-cal="tot-total"]' }
]

const ALL = BLOCKS.concat(ITEMS)

// Bloque antiguo (imp.html previo) -> items que heredan su ajuste.
var BLOCK_ITEMS = {
  pago: ['pago-efectivo', 'pago-debito', 'pago-credito', 'pago-transferencia', 'pago-movil', 'pago-banco'],
  bcv: ['bcv-tasa', 'bcv-divisas'],
  totlabels: ['tot-iva-pct', 'tot-iva-base', 'tot-igtf-base'],
  totvals: ['tot-base', 'tot-otros', 'tot-iva', 'tot-igtf', 'tot-total']
}

const root = document.documentElement
let state = {}
let current = null
let refitHandler = null

// Tamaño automático (pt) por objetivo = el maxPt que usa fitCell en data.js.
const SIZE_DEFAULTS = {
  emision: 8.5,
  cliente: 9.2,
  renglon: 8.4,
  desc: 8.4,
  cant: 8.4,
  precio: 6.7,
  exento: 8.4,
  monto: 6.7,
  'pago-efectivo': 7.5,
  'pago-debito': 7.5,
  'pago-credito': 7.5,
  'pago-transferencia': 7.2,
  'pago-movil': 7.2,
  'pago-banco': 7.2,
  'bcv-tasa': 8,
  'bcv-divisas': 8.6,
  'tot-iva-pct': 7.5,
  'tot-iva-base': 7.5,
  'tot-igtf-base': 7.5,
  'tot-base': 6.7,
  'tot-otros': 6.7,
  'tot-iva': 6.7,
  'tot-igtf': 6.7,
  'tot-total': 7.2
}

function round1(n) { return Math.round(n * 10) / 10 }
function clamp(v) { return Math.max(-30, Math.min(30, v)) }
function clampSize(v) { return Math.max(3, Math.min(30, v)) }

// Estado inicial: calibration.json (baseline). Faltantes -> 0.
function buildState() {
  const s = {}
  s.offset = {
    x: +initialCal.offset?.x || 0,
    y: +initialCal.offset?.y || 0
  }
  ALL.forEach((item) => {
    const e = initialCal[item.id]
    s[item.id] = {
      x: e ? +e.x || 0 : 0,
      y: e ? +e.y || 0 : 0,
      s: e && e.s != null ? +e.s : null
    }
  })
  return s
}

function wrapCells() {
  document.querySelectorAll('.items-table tbody td').forEach((cell) => {
    if (cell.firstElementChild && cell.firstElementChild.classList.contains('cal-cell')) return
    const span = document.createElement('span')
    span.className = 'cal-cell'
    while (cell.firstChild) span.appendChild(cell.firstChild)
    cell.appendChild(span)
  })
}

// Cada item de dato se envuelve para mover solo el texto, no la línea ni el rótulo.
function wrapItems() {
  ITEMS.forEach((item) => {
    const outer = document.querySelector(item.target)
    if (!outer) return
    let inner = outer.querySelector('.cal-cell')
    if (!inner) {
      inner = document.createElement('span')
      inner.className = 'cal-cell'
      while (outer.firstChild) inner.appendChild(outer.firstChild)
      outer.appendChild(inner)
    }
    inner.classList.add('cal-it-' + item.id)
  })
}

function applyAll() {
  root.style.setProperty('--offset-x', state.offset.x + 'mm')
  root.style.setProperty('--offset-y', state.offset.y + 'mm')
  ALL.forEach((s) => {
    const v = state[s.id]
    root.style.setProperty('--cal-' + s.id + '-x', v.x + 'mm')
    root.style.setProperty('--cal-' + s.id + '-y', v.y + 'mm')
  })
}

// Tamaño exacto fijado por el usuario (pt), o null = automático (fitCell).
export function getExactSize(id) {
  const v = state[id] && state[id].s
  return v == null ? null : v
}

// Tamaño automático por defecto (pt) de un objetivo.
export function getDefaultSize(id) {
  return SIZE_DEFAULTS[id] ?? null
}

// data.js registra aquí su repaint para que los cambios de tamaño se vean en vivo.
export function onCalibrationChange(fn) { refitHandler = fn }
function refit() { if (refitHandler) refitHandler() }

function targetsFor(id) {
  const q = (sel) => Array.from(document.querySelectorAll(sel))
  const item = ITEMS.find((it) => it.id === id)
  if (item) {
    const outer = document.querySelector(item.target)
    if (!outer) return []
    return [outer.querySelector('.cal-cell') || outer]
  }
  switch (id) {
    case 'emision': return q('.top-bar .print-data')
    case 'cliente': return q('.client-box .print-data')
    default: {
      const idx = { renglon: 1, desc: 2, cant: 3, precio: 4, exento: 5, monto: 6 }[id]
      if (!idx) return []
      return q('.items-table tbody td:nth-child(' + idx + ')')
    }
  }
}

function clearHighlight() {
  document.querySelectorAll('.cal-target').forEach((el) => el.classList.remove('cal-target'))
}

function refreshControls() {
  const outX = document.getElementById('calValX')
  const outY = document.getElementById('calValY')
  const outS = document.getElementById('calValS')
  const label = document.getElementById('calCurrent')
  if (!current) {
    label.textContent = 'Selecciona una sección'
    outX.textContent = '0.0'
    outY.textContent = '0.0'
    if (outS) outS.textContent = '0.0'
    return
  }
  const info = ALL.find((s) => s.id === current)
  label.textContent = info ? info.label : current
  outX.textContent = state[current].x.toFixed(1)
  outY.textContent = state[current].y.toFixed(1)
  if (outS) outS.textContent = sizeDisplay(current)
}

function sizeDisplay(id) {
  const v = state[id] && state[id].s
  return (v != null ? v : (SIZE_DEFAULTS[id] ?? 0)).toFixed(1)
}

function select(id) {
  current = id
  document.querySelectorAll('#calSections a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-id') === id)
  })
  clearHighlight()
  targetsFor(id).forEach((el) => el.classList.add('cal-target'))
  refreshControls()
}

function adjust(axis, delta) {
  if (!current) return
  if (axis === 's') {
    const base = state[current].s != null ? state[current].s : (SIZE_DEFAULTS[current] ?? 8)
    state[current].s = round1(clampSize(base + delta))
    refit()
    refreshControls()
    return
  }
  const v = state[current]
  v[axis] = round1(clamp(v[axis] + delta))
  applyAll()
  refreshControls()
}

function resetSize() {
  if (!current) return
  state[current].s = null
  refit()
  refreshControls()
}

function resetSection() {
  if (!current) return
  state[current] = { x: 0, y: 0, s: null }
  applyAll()
  refit()
  refreshControls()
}

function resetAll() {
  state.offset = { x: 0, y: 0 }
  syncOffsetInputs()
  ALL.forEach((s) => { state[s.id] = { x: 0, y: 0, s: null } })
  applyAll()
  refit()
  refreshControls()
}

function buildNav() {
  const nav = document.getElementById('calSections')
  let lastGroup = null
  ALL.forEach((s) => {
    if (s.group && s.group !== lastGroup) {
      const h = document.createElement('span')
      h.className = 'cal-nav-group'
      h.textContent = s.group
      nav.appendChild(h)
      lastGroup = s.group
    }
    const a = document.createElement('a')
    a.href = '#'
    a.setAttribute('data-id', s.id)
    a.textContent = s.label
    if (s.group) a.className = 'cal-nav-item'
    a.addEventListener('click', (ev) => {
      ev.preventDefault()
      select(s.id)
    })
    nav.appendChild(a)
  })
}

function syncOffsetInputs() {
  const inputs = document.querySelectorAll('.toolbar input[type="number"]')
  if (inputs[0]) inputs[0].value = state.offset.x
  if (inputs[1]) inputs[1].value = state.offset.y
}

function wireOffsetInputs() {
  const inputs = document.querySelectorAll('.toolbar input[type="number"]')
  if (inputs[0]) inputs[0].addEventListener('input', function () {
    state.offset.x = round1(parseFloat(this.value) || 0)
    applyAll()
  })
  if (inputs[1]) inputs[1].addEventListener('input', function () {
    state.offset.y = round1(parseFloat(this.value) || 0)
    applyAll()
  })
}

// Importa calibración desde el texto de un HTML calibrado (ej. imp.html).
// Devuelve cuántos valores cargó. No guarda: pulsa "Guardar calibración" para fijarlos.
function importFromText(text) {
  const found = {}
  const re = /--cal-([a-z0-9-]+)-([xy])\s*:\s*(-?\d+(?:\.\d+)?)mm/g
  let m
  while ((m = re.exec(text)) !== null) {
    found[m[1]] = found[m[1]] || {}
    found[m[1]][m[2]] = round1(clamp(parseFloat(m[3])))
  }

  let parsed = 0

  // Bloques viejos: se reparten entre sus items
  Object.keys(BLOCK_ITEMS).forEach((b) => {
    if (!found[b]) return
    BLOCK_ITEMS[b].forEach((id) => {
      state[id] = { ...state[id], x: found[b].x || 0, y: found[b].y || 0 }
      parsed++
    })
  })

  // Items con valor propio (tienen prioridad sobre el bloque)
  ALL.forEach((s) => {
    if (!found[s.id]) return
    state[s.id] = { ...state[s.id], x: found[s.id].x || 0, y: found[s.id].y || 0 }
    parsed++
  })

  const ox = /--offset-x\s*:\s*(-?\d+(?:\.\d+)?)mm/.exec(text)
  const oy = /--offset-y\s*:\s*(-?\d+(?:\.\d+)?)mm/.exec(text)
  if (ox) state.offset.x = round1(clamp(parseFloat(ox[1])))
  if (oy) state.offset.y = round1(clamp(parseFloat(oy[1])))

  applyAll()
  syncOffsetInputs()
  refreshControls()
  if (current) select(current)

  return parsed
}

// Guardar: escribe calibration.json vía el plugin de Vite (solo en dev).
export async function saveCalibration() {
  const msg = document.getElementById('calMsg')
  try {
    const res = await fetch('/__save-calibration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state, null, 2)
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    if (msg) msg.textContent = '✓ Calibración guardada en src/calibration.json'
  } catch (e) {
    if (msg) msg.textContent = 'No se pudo guardar (¿vite dev corriendo?). ' + e.message
  }
}

export function initCalibration() {
  state = buildState()
  wrapCells()
  wrapItems()
  buildNav()
  applyAll()
  syncOffsetInputs()
  wireOffsetInputs()
  refreshControls()

  const panel = document.getElementById('calPanel')
  const toggle = document.getElementById('calToggle')

  toggle.addEventListener('click', () => {
    const dataPanel = document.getElementById('dataPanel')
    const dataToggle = document.getElementById('dataToggle')
    if (dataPanel) dataPanel.classList.remove('open')
    if (dataToggle) dataToggle.style.display = ''
    document.body.classList.remove('data-open')
    panel.classList.add('open')
    toggle.style.display = 'none'
  })

  document.getElementById('calClose').addEventListener('click', () => {
    panel.classList.remove('open')
    toggle.style.display = ''
  })

  document.getElementById('calControls').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-axis]')
    if (!btn) return
    adjust(btn.getAttribute('data-axis'), parseFloat(btn.getAttribute('data-delta')))
  })

  document.getElementById('calResetSection').addEventListener('click', resetSection)
  document.getElementById('calResetAll').addEventListener('click', resetAll)
  document.getElementById('calResetSize').addEventListener('click', resetSize)
  document.getElementById('calSave').addEventListener('click', saveCalibration)

  const fileInput = document.getElementById('calFile')
  const msg = document.getElementById('calMsg')
  document.getElementById('calImport').addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const count = importFromText(String(reader.result))
      msg.textContent = count > 0
        ? 'Calibración cargada: ' + count + ' valores. Pulsa "Guardar calibración" para fijarla en calibration.json.'
        : 'No se encontraron variables --cal-* en ese archivo.'
      fileInput.value = ''
    }
    reader.onerror = () => { msg.textContent = 'No se pudo leer el archivo.'; fileInput.value = '' }
    reader.readAsText(file, 'utf-8')
  })
}
