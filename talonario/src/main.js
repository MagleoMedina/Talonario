import './style.css'
import templateHtml from './template.html?raw'
import { initCalibration } from './calibration.js'
import { initData } from './data.js'
import { initEmpresas } from './empresas.js'

document.getElementById('app').innerHTML = templateHtml

// Orden importa: calibration envuelve las celdas en .cal-cell antes de que
// data renderice los valores dentro de ellas. Empresas depende de data.
initCalibration()
initData()
initEmpresas()
