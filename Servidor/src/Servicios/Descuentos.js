export function ObtenerDescuentoVolumen(cantidad) {
  const unidades=Number(cantidad)
  if (unidades>=21) return 20
  if (unidades>=11) return 15
  if (unidades>=5) return 10
  return 0
}

export function CalcularDescuentoTotal(descuentoFijo,cantidad) {
  const fijo=Math.max(0,Math.min(100,Number(descuentoFijo)||0))
  const volumen=ObtenerDescuentoVolumen(cantidad)
  return {
    fijo,
    volumen,
    total:Math.min(100,fijo+volumen)
  }
}

export function CalcularSubtotal(precio,cantidad,descuentoTotal) {
  return Number((Number(precio)*Number(cantidad)*(1-Number(descuentoTotal)/100)).toFixed(2))
}