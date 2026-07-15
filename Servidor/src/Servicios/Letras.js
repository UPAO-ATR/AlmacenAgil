const Unidades=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve']
const Especiales=['diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve']
const Decenas=['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa']
const Centenas=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos']

function ConvertirDecena(numero) {
  if (numero<10) return Unidades[numero]
  if (numero<20) return Especiales[numero-10]
  const decena=Math.floor(numero/10)
  const unidad=numero%10
  if (numero<30) return unidad?`veinti${Unidades[unidad]}`:'veinte'
  return unidad?`${Decenas[decena]} y ${Unidades[unidad]}`:Decenas[decena]
}

function ConvertirGrupo(numero) {
  if (numero===0) return ''
  if (numero===100) return 'cien'
  const centena=Math.floor(numero/100)
  const resto=numero%100
  const partes=[]
  if (centena) partes.push(Centenas[centena])
  if (resto) partes.push(ConvertirDecena(resto))
  return partes.join(' ')
}

function ConApocope(texto) {
  if (texto.endsWith('veintiuno')) return `${texto.slice(0,-9)}veintiún`
  return texto.replace(/uno$/,'un')
}

export function NumeroEnPalabras(numero) {
  const entero=Math.trunc(Math.abs(numero))
  if (entero===0) return 'cero'
  const millones=Math.floor(entero/1000000)
  const miles=Math.floor((entero%1000000)/1000)
  const resto=entero%1000
  const partes=[]
  if (millones) {
    const texto=ConApocope(ConvertirGrupo(millones))
    partes.push(millones===1?`${texto} millón`:`${texto} millones`)
  }
  if (miles) {
    partes.push(miles===1?'mil':`${ConApocope(ConvertirGrupo(miles))} mil`)
  }
  if (resto) partes.push(ConvertirGrupo(resto))
  return partes.join(' ').trim()
}

export function MontoEnLetras(numero,moneda='SOLES') {
  const texto=Number(numero).toFixed(2)
  const [enteroTexto,decimalTexto]=texto.split('.')
  return `${NumeroEnPalabras(Number(enteroTexto))} con ${decimalTexto}/100 ${moneda}`.toUpperCase()
}
