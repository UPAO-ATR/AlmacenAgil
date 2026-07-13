const VariablesRequeridas=['URLBASE','SECRETOACCESO','CLAVEADMINISTRADOR','CLAVEADMINRESPALDO','CLAVEVENTAS','CLAVEALMACEN']

export function ValidarConfiguracion() {
  const faltantes=VariablesRequeridas.filter(nombre=>!process.env[nombre])
  if (faltantes.length) throw new Error(`Faltan variables: ${faltantes.join(', ')}`)
  if (process.env.SECRETOACCESO.length<43) throw new Error('Secreto de acceso insuficiente')
  for (const nombre of ['CLAVEADMINISTRADOR','CLAVEADMINRESPALDO','CLAVEVENTAS','CLAVEALMACEN']) {
    if (process.env[nombre].length<12) throw new Error(`Clave insuficiente: ${nombre}`)
  }
  const correoDefinido=Boolean(process.env.SERVIDORCORREO)
  const credencialesParciales=Boolean(process.env.USUARIOCORREO)!==Boolean(process.env.CLAVECORREO)
  if (correoDefinido&&credencialesParciales) throw new Error('Configuración de correo incompleta')
}