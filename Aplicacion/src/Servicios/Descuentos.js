export function ObtenerDescuentoVolumen(cantidad) {
  const unidades=Number(cantidad)
  if (unidades>=21) return 20
  if (unidades>=11) return 15
  if (unidades>=5) return 10
  return 0
}

export function CalcularLinea(precio,cantidad,descuentoFijo=0) {
  const fijo=Math.max(0,Math.min(100,Number(descuentoFijo)||0))
  const volumen=ObtenerDescuentoVolumen(cantidad)
  const descuento=Math.min(100,fijo+volumen)
  const subtotal=Number(precio)*Number(cantidad)
  const total=subtotal*(1-descuento/100)
  return {fijo,volumen,descuento,subtotal,total}
}