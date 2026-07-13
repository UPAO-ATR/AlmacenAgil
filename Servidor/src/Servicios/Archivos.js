const Firmas = {
  'application/pdf': buffer=>buffer.subarray(0,5).toString()==='%PDF-',
  'image/png': buffer=>buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
  'image/jpeg': buffer=>buffer.length>3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255,
  'image/webp': buffer=>buffer.length>12&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP'
}

export function PrepararArchivo(archivo) {
  const contenido = Buffer.from(archivo.datos,'base64')
  if (!contenido.length||contenido.length>1300000) throw new Error('Archivo demasiado grande')
  if (!Firmas[archivo.tipo]?.(contenido)) throw new Error('Contenido de archivo inválido')
  const nombre = archivo.nombre.replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ .()_-]/g,'').slice(0,180)||'archivo'
  return {contenido,tipo:archivo.tipo,nombre}
}

export function EnviarArchivo(res,registro,prefijo='archivo') {
  if (!registro?.contenido) return res.status(404).json({mensaje:'Archivo no encontrado'})
  const nombre = (registro.nombre||prefijo).replace(/[\r\n"]/g,'')
  res.set('Content-Type',registro.tipo||'application/octet-stream')
  res.set('Content-Disposition',`attachment; filename="${nombre}"`)
  res.set('X-Content-Type-Options','nosniff')
  res.set('Cache-Control','no-store')
  res.send(registro.contenido)
}