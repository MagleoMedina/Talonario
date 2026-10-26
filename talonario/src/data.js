import { saveCalibration, getExactSize, getDefaultSize, onCalibrationChange } from './calibration.js'

const DATA_KEY = 'talonario-data-v2'
const ROWS = 24

let moneyFmt
try {
  moneyFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
} catch (e) {
  moneyFmt = { format: (n) => (n || 0).toFixed(2).replace('.', ',') }
}

const fmt = (n) => moneyFmt.format(n || 0)
const pad = (n, size) => { let s = String(n); while (s.length < size) s = '0' + s; return s }
const text = (el, v) => { if (el) el.textContent = v }
const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : '' }
const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v }
const setChecked = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v }
const textOf = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : '' }
const slot = (el) => (el ? (el.querySelector('.cal-cell') || el) : null)

function cellText(cell) {
  if (!cell) return ''
  const inner = cell.querySelector('.cal-cell')
  return (inner || cell).textContent.trim()
}

function num(v) {
  let s = String(v == null ? '' : v).trim().replace(/\s|Bs\.?|\$/gi, '')
  if (!s) return 0
  if (s.indexOf(',') !== -1) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

const rowEls = () => Array.from(document.querySelectorAll('#d-rows .d-row'))

function buildRows() {
  const wrap = document.getElementById('d-rows')
  if (!wrap) return
  let html = ''
  for (let i = 1; i <= ROWS; i++) {
    html += '<div class="d-row" data-row="' + i + '">' +
      '<div class="d-line1">' +
        '<input class="d-ren" type="text" autocomplete="off" placeholder="N°" />' +
        '<input class="d-desc" type="text" autocomplete="off" placeholder="Descripción" />' +
      '</div>' +
      '<div class="d-line2">' +
        '<label class="d-mini"><span>Cant.</span>' +
          '<input class="d-cant" type="text" inputmode="decimal" placeholder="0" /></label>' +
        '<label class="d-mini"><span>Precio</span>' +
          '<input class="d-precio" type="text" inputmode="decimal" placeholder="0,00" /></label>' +
        '<label class="d-mini"><span>E</span>' +
          '<input class="d-e" type="checkbox" title="Exento" /></label>' +
        '<label class="d-mini"><span>Monto</span>' +
          '<input class="d-monto" type="text" inputmode="decimal" placeholder="0,00" /></label>' +
      '</div>' +
      '</div>'
  }
  wrap.innerHTML = html
}

function readRow(row) {
  return {
    ren: row.querySelector('.d-ren').value.trim(),
    desc: row.querySelector('.d-desc').value.trim(),
    cant: row.querySelector('.d-cant').value.trim(),
    precio: row.querySelector('.d-precio').value.trim(),
    exento: row.querySelector('.d-e').checked,
    monto: row.querySelector('.d-monto').value.trim()
  }
}

function applyState(s) {
  s = s || {}
  const e = s.emision || {}
  setVal('d-lugar', e.lugar || '')
  setVal('d-dia', e.dia || '')
  setVal('d-mes', e.mes || '')
  setVal('d-anio', e.anio || '')

  const c = s.cliente || {}
  setVal('d-nombre', c.nombre || '')
  setVal('d-domicilio', c.domicilio || '')
  setVal('d-rif', c.rif || '')
  setVal('d-telefono', c.telefono || '')
  setVal('d-cond', c.condiciones || '')

  const rows = s.rows || []
  rowEls().forEach((row, i) => {
    const r = rows[i] || {}
    row.querySelector('.d-ren').value = r.ren || ''
    row.querySelector('.d-desc').value = r.desc || ''
    row.querySelector('.d-cant').value = r.cant || ''
    row.querySelector('.d-precio').value = r.precio || ''
    row.querySelector('.d-e').checked = !!r.exento
    row.querySelector('.d-monto').value = r.monto || ''
  })

  const p = s.pago || {}
  setChecked('d-efectivo', p.efectivo)
  setChecked('d-debito', p.debito)
  setChecked('d-credito', p.credito)
  setVal('d-transferencia', p.transferencia || '')
  setVal('d-movil', p.movil || '')
  setVal('d-banco', p.banco || '')

  const b = s.bcv || {}
  setVal('d-tasa', b.tasa || '')
  setVal('d-divisas', b.divisas || '')

  const t = s.totales || {}
  setVal('d-iva-pct', t.ivaPct || '')
  setVal('d-iva-base', t.ivaBase || '')
  setVal('d-igtf-base', t.igtfBase || '')
  setVal('d-base', t.base || '')
  setVal('d-otros', t.otros || '')
  setVal('d-iva', t.iva || '')
  setVal('d-igtf', t.igtf || '')
  setVal('d-total', t.total || '')
}

function readFromDom() {
  const s = { emision: {}, cliente: {}, rows: [], pago: {}, bcv: {}, totales: {} }

  s.emision.lugar = textOf('.top-bar .lugar-text')
  const digits = document.querySelectorAll('.emission-values .sub-ticks span')
  const dg = (i) => (digits[i] ? digits[i].textContent.trim() : '')
  s.emision.dia = dg(0) + dg(1)
  s.emision.mes = dg(2) + dg(3)
  s.emision.anio = dg(4) + dg(5) + dg(6) + dg(7)

  const cv = document.querySelectorAll('.client-box .client-val')
  s.cliente.nombre = cv[0] ? cv[0].textContent.trim() : ''
  s.cliente.domicilio = cv[1] ? cv[1].textContent.trim() : ''
  s.cliente.rif = cv[2] ? cv[2].textContent.trim() : ''
  s.cliente.telefono = cv[3] ? cv[3].textContent.trim() : ''
  s.cliente.condiciones = cv[4] ? cv[4].textContent.trim() : ''

  document.querySelectorAll('.items-table tbody tr').forEach((tr) => {
    const cells = tr.querySelectorAll('td')
    s.rows.push({
      ren: cellText(cells[0]),
      desc: cellText(cells[1]),
      cant: cellText(cells[2]),
      precio: cellText(cells[3]),
      exento: /^(E|X)$/i.test(cellText(cells[4])),
      monto: cellText(cells[5])
    })
  })

  const checks = document.querySelectorAll('.payment-col .checkbox-sq .print-data')
  s.pago.efectivo = checks[0] ? checks[0].textContent.trim() !== '' : false
  s.pago.debito = checks[1] ? checks[1].textContent.trim() !== '' : false
  s.pago.credito = checks[2] ? checks[2].textContent.trim() !== '' : false

  const fills = document.querySelectorAll('.payment-col .line-fill')
  s.pago.transferencia = fills[0] ? fills[0].textContent.trim() : ''
  s.pago.movil = fills[1] ? fills[1].textContent.trim() : ''
  s.pago.banco = fills[2] ? fills[2].textContent.trim() : ''

  s.bcv.tasa = textOf('.bcv-col .inline-line')
  const bcvFill = document.querySelector('.bcv-col .line-fill')
  s.bcv.divisas = bcvFill ? bcvFill.textContent.trim() : ''

  s.totales.ivaPct = textOf('.totals-labels-col .blank-pct')
  const lm = document.querySelectorAll('.totals-labels-col .blank-monto')
  s.totales.ivaBase = lm[0] ? lm[0].textContent.trim() : ''
  s.totales.igtfBase = lm[1] ? lm[1].textContent.trim() : ''

  const tv = document.querySelectorAll('.totals-values-col .tot-val-cell')
  s.totales.base = tv[0] ? tv[0].textContent.trim() : ''
  s.totales.otros = tv[1] ? tv[1].textContent.trim() : ''
  s.totales.iva = tv[2] ? tv[2].textContent.trim() : ''
  s.totales.igtf = tv[3] ? tv[3].textContent.trim() : ''
  s.totales.total = tv[4] ? tv[4].textContent.trim() : ''

  return s
}

function collect() {
  return {
    emision: { lugar: val('d-lugar'), dia: val('d-dia'), mes: val('d-mes'), anio: val('d-anio') },
    cliente: {
      nombre: val('d-nombre'), domicilio: val('d-domicilio'), rif: val('d-rif'),
      telefono: val('d-telefono'), condiciones: val('d-cond')
    },
    rows: rowEls().map(readRow),
    pago: {
      efectivo: document.getElementById('d-efectivo').checked,
      debito: document.getElementById('d-debito').checked,
      credito: document.getElementById('d-credito').checked,
      transferencia: val('d-transferencia'), movil: val('d-movil'), banco: val('d-banco')
    },
    bcv: { tasa: val('d-tasa'), divisas: val('d-divisas') },
    totales: {
      ivaPct: val('d-iva-pct'), ivaBase: val('d-iva-base'), igtfBase: val('d-igtf-base'),
      base: val('d-base'), otros: val('d-otros'), iva: val('d-iva'), igtf: val('d-igtf'), total: val('d-total')
    }
  }
}

const persist = () => { try { localStorage.setItem(DATA_KEY, JSON.stringify(collect())) } catch (e) {} }

/* ===== AJUSTE DE FUENTE: el dato se reduce hasta que quepa en su caja ===== */
const fitCache = new WeakMap()

function fitCell(cell, box, maxPt, minPt, allowWrap) {
  if (!cell || !box) return

  const key = cell.textContent + '|' + maxPt + '|' + minPt
  if (fitCache.get(cell) === key) return
  fitCache.set(cell, key)

  const cs = getComputedStyle(box)
  let avail = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)

  // Si el dato comparte fila con un rótulo, el ancho útil es lo que queda.
  if (box === cell.parentElement) {
    const pcs = getComputedStyle(box)
    if (pcs.display.indexOf('flex') === 0 && pcs.flexDirection.indexOf('row') === 0) {
      Array.from(box.children).forEach((c) => { if (c !== cell) avail -= c.offsetWidth })
    }
  }

  if (!(avail > 4)) return

  cell.style.whiteSpace = 'nowrap'
  cell.style.fontSize = maxPt + 'pt'

  const w = cell.scrollWidth
  if (w <= avail + 0.5) return

  const size = Math.max(minPt, Math.round(maxPt * (avail / w) * 10) / 10)
  cell.style.fontSize = size + 'pt'

  if (cell.scrollWidth > avail + 0.5) {
    if (allowWrap) {
      // Sigue sin caber en una línea: se deja envolver dentro de la caja.
      cell.style.fontSize = ''
      cell.style.whiteSpace = ''
    } else {
      cell.style.fontSize = minPt + 'pt'
    }
  }
}

const COL_IDS = ['renglon', 'desc', 'cant', 'precio', 'exento', 'monto']
const PAY_IDS = ['pago-transferencia', 'pago-movil', 'pago-banco']
const TOT_IDS = ['tot-base', 'tot-otros', 'tot-iva', 'tot-igtf', 'tot-total']
const CHK_IDS = ['pago-efectivo', 'pago-debito', 'pago-credito']

// Aplica el tamaño de una celda: exacto (s del usuario, en pt) o automático (fitCell).
function paint(cell, box, id, autoMax, autoMin, allowWrap) {
  const exact = getExactSize(id)
  if (exact != null) {
    cell.style.whiteSpace = 'nowrap'
    cell.style.fontSize = exact + 'pt'
    return
  }
  fitCache.delete(cell) // fuerza recálculo al volver a automático
  fitCell(cell, box, autoMax, autoMin, allowWrap)
}

function fitAll() {
  const lugar = document.querySelector('.top-bar .lugar-text')
  if (lugar) paint(lugar, lugar.parentNode, 'emision', getDefaultSize('emision'), 5.5, true)

  Array.from(document.querySelectorAll('.client-box .client-val')).forEach((el, i) => {
    if (i === 1) paint(el, el.parentNode, 'cliente', 7.4, 4.8, true) // domicilio: -20%
    else paint(el, el.parentNode, 'cliente', getDefaultSize('cliente'), 6, true)
  })

  Array.from(document.querySelectorAll('.items-table tbody td')).forEach((td) => {
    const cell = td.querySelector('.cal-cell')
    if (!cell) return
    const id = COL_IDS[td.cellIndex]
    const small = td.cellIndex === 3 || td.cellIndex === 5 // precio y monto: -20%
    paint(cell, td, id, getDefaultSize(id) ?? (small ? 6.7 : 8.4), small ? 4.4 : 5.5, false)
  })

  // Líneas de pago: transferencia / pago móvil / banco
  Array.from(document.querySelectorAll('.payment-col .line-fill')).forEach((box, i) => {
    const cell = box.querySelector('.cal-cell')
    if (!cell) return
    const id = PAY_IDS[i]
    paint(cell, box, id, getDefaultSize(id) ?? 7.2, 4.5, false)
  })

  // Monto recibido en divisas: +20%
  const bcvFill = document.querySelector('.bcv-col .line-fill')
  if (bcvFill) {
    const cell = bcvFill.querySelector('.cal-cell')
    if (cell) paint(cell, bcvFill, 'bcv-divisas', getDefaultSize('bcv-divisas'), 5.4, false)
  }

  const inline = document.querySelector('.bcv-col .inline-line')
  if (inline) {
    const inlineCell = inline.querySelector('.cal-cell')
    if (inlineCell) paint(inlineCell, inline, 'bcv-tasa', getDefaultSize('bcv-tasa'), 5.5, false)
  }

  // Totales: valores (BASE / OTROS / IVA / IGTF / TOTAL)
  const totCells = document.querySelectorAll('.totals-values-col .tot-val-cell')
  Array.from(totCells).forEach((box, i) => {
    const cell = box.querySelector('.cal-cell')
    if (!cell) return
    const id = TOT_IDS[i]
    const isLast = i === totCells.length - 1
    paint(cell, box, id, getDefaultSize(id) ?? (isLast ? 7.2 : 6.7), 4.8, false)
  })

  // Casilleros % y montos en la columna de rótulos
  Array.from(
    document.querySelectorAll('.totals-labels-col .blank-pct, .totals-labels-col .blank-monto')
  ).forEach((box, i) => {
    const cell = box.querySelector('.cal-cell')
    if (!cell) return
    const id = i === 0 ? 'tot-iva-pct' : i === 1 ? 'tot-iva-base' : 'tot-igtf-base'
    paint(cell, box, id, getDefaultSize(id) ?? 7.5, 5.5, false)
  })

  // Checks de forma de pago (solo si el usuario fija un tamaño exacto)
  Array.from(document.querySelectorAll('.payment-col .checkbox-sq .print-data')).forEach((el, i) => {
    const exact = getExactSize(CHK_IDS[i])
    if (exact != null) el.style.fontSize = exact + 'pt'
    else el.style.fontSize = ''
  })
}

function render() {
  // Emisión
  text(document.querySelector('.top-bar .lugar-text'), val('d-lugar'))
  const digits = document.querySelectorAll('.emission-values .sub-ticks span')
  const day = val('d-dia'), mes = val('d-mes'), anio = val('d-anio')
  const seq = [day.charAt(0), day.charAt(1), mes.charAt(0), mes.charAt(1),
               anio.charAt(0), anio.charAt(1), anio.charAt(2), anio.charAt(3)]
  digits.forEach((span, i) => { span.textContent = seq[i] || '' })

  // Cliente
  const clientVals = document.querySelectorAll('.client-box .client-val')
  ;[val('d-nombre'), val('d-domicilio'), val('d-rif'), val('d-telefono'), val('d-cond')]
    .forEach((v, i) => { text(clientVals[i], v) })

  // Renglones (todos manuales)
  const tbodyRows = document.querySelectorAll('.items-table tbody tr')
  rowEls().forEach((row, i) => {
    const r = readRow(row)
    const tr = tbodyRows[i]
    if (!tr) return
    const cells = tr.querySelectorAll('td')
    const inner = (cell) => (cell ? (cell.querySelector('.cal-cell') || cell) : null)
    text(inner(cells[0]), r.ren)
    text(inner(cells[1]), r.desc)
    text(inner(cells[2]), r.cant)
    text(inner(cells[3]), r.precio)
    text(inner(cells[4]), r.exento ? 'X' : '')
    text(inner(cells[5]), r.monto)
  })

  // Totales (todos manuales)
  text(slot(document.querySelector('.totals-labels-col .blank-pct')), val('d-iva-pct'))
  const labelMontos = document.querySelectorAll('.totals-labels-col .blank-monto')
  text(slot(labelMontos[0]), val('d-iva-base'))
  text(slot(labelMontos[1]), val('d-igtf-base'))

  const cellsTot = document.querySelectorAll('.totals-values-col .tot-val-cell')
  ;[val('d-base'), val('d-otros'), val('d-iva'), val('d-igtf'), val('d-total')]
    .forEach((v, i) => { text(slot(cellsTot[i]), v) })

  // Forma de pago
  const checks = document.querySelectorAll('.payment-col .checkbox-sq .print-data')
  ;[
    document.getElementById('d-efectivo').checked,
    document.getElementById('d-debito').checked,
    document.getElementById('d-credito').checked
  ].forEach((on, i) => { text(slot(checks[i]), on ? 'X' : '') })

  const fills = document.querySelectorAll('.payment-col .line-fill')
  text(slot(fills[0]), val('d-transferencia'))
  text(slot(fills[1]), val('d-movil'))
  text(slot(fills[2]), val('d-banco'))

  // BCV
  text(slot(document.querySelector('.bcv-col .inline-line')), val('d-tasa'))
  text(slot(document.querySelector('.bcv-col .line-fill')), val('d-divisas'))

  fitAll()
  persist()
}

function formatMoneyField(el) {
  const raw = el.value.trim()
  if (!raw || !/\d/.test(raw)) return
  el.value = fmt(num(raw))
}

function clearAll() {
  applyState({})
  render()
}

// Carga una empresa/cliente guardado en los campos del formulario.
export function loadClient(c) {
  if (!c) return
  setVal('d-nombre', c.nombre || '')
  setVal('d-domicilio', c.domicilio || '')
  setVal('d-rif', c.rif || '')
  setVal('d-telefono', c.telefono || '')
  render()
}

export function initData() {
  buildRows()
  onCalibrationChange(fitAll)

  let saved = null
  try { saved = JSON.parse(localStorage.getItem(DATA_KEY) || 'null') } catch (e) {}

  const state = saved || readFromDom()
  if (!state.totales) state.totales = {}
  applyState(state)
  render()

  const panel = document.getElementById('dataPanel')
  const toggle = document.getElementById('dataToggle')

  ;[['d-dia', 2], ['d-mes', 2], ['d-anio', 4]].forEach((pair) => {
    const el = document.getElementById(pair[0])
    const size = pair[1]
    el.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, size) })
    el.addEventListener('blur', function () {
      if (this.value) this.value = pad(this.value, size)
      render()
    })
  })

  document.getElementById('d-rows').addEventListener('blur', (ev) => {
    const el = ev.target
    if (el && (el.classList.contains('d-precio') || el.classList.contains('d-monto'))) {
      formatMoneyField(el)
      render()
    }
  }, true)

  ;['d-iva-base', 'd-igtf-base', 'd-base', 'd-otros', 'd-iva', 'd-igtf', 'd-total'].forEach((id) => {
    document.getElementById(id).addEventListener('blur', function () { formatMoneyField(this); render() })
  })

  document.querySelectorAll('#dataPanel input, #dataPanel textarea').forEach((el) => {
    el.addEventListener('input', function () { this.title = this.value; render() })
    el.addEventListener('change', render)
  })

  toggle.addEventListener('click', () => {
    const calPanel = document.getElementById('calPanel')
    const calToggle = document.getElementById('calToggle')
    if (calPanel) calPanel.classList.remove('open')
    if (calToggle) calToggle.style.display = ''
    document.body.classList.add('data-open')
    panel.classList.add('open')
    toggle.style.display = 'none'
  })

  document.getElementById('dataClose').addEventListener('click', () => {
    panel.classList.remove('open')
    toggle.style.display = ''
    document.body.classList.remove('data-open')
  })

  document.getElementById('d-print').addEventListener('click', () => window.print())
  document.getElementById('d-save').addEventListener('click', saveCalibration)
  document.getElementById('d-clear').addEventListener('click', () => {
    if (confirm('¿Borrar todos los datos capturados? La calibración no se modifica.')) clearAll()
  })
}
