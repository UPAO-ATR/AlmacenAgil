let Proteccion=''

export function DefinirProteccion(valor='') {
  Proteccion=valor
}

export async function Solicitar(ruta,opciones={}) {
  const cabeceras=new Headers(opciones.headers||{})
  const metodo=(opciones.method||'GET').toUpperCase()
  if (opciones.body&&!cabeceras.has('Content-Type')) cabeceras.set('Content-Type','application/json')
  if (!['GET','HEAD','OPTIONS'].includes(metodo)&&Proteccion) cabeceras.set('X-Proteccion',Proteccion)
  const respuesta=await fetch(`/api${ruta}`,{
    credentials:'include',
    cache:'no-store',
    ...opciones,
    headers:cabeceras
  })
  if (respuesta.status===204) return null
  const tipo=respuesta.headers.get('content-type')||''
  if (!tipo.includes('application/json')) {
    if (!respuesta.ok) throw new Error('Respuesta inválida')
    return respuesta
  }
  const datos=await respuesta.json().catch(()=>({mensaje:'Respuesta inválida'}))
  if (!respuesta.ok) throw new Error(datos.mensaje||'No se pudo completar')
  return datos
}

export function Descargar(ruta,nombre='archivo') {
  return fetch(`/api${ruta}`,{credentials:'include',headers:Proteccion?{'X-Proteccion':Proteccion}:{}})
    .then(async respuesta=>{
      if (!respuesta.ok) {
        const datos=await respuesta.json().catch(()=>({mensaje:'No se pudo descargar'}))
        throw new Error(datos.mensaje)
      }
      const blob=await respuesta.blob()
      const enlace=document.createElement('a')
      enlace.href=URL.createObjectURL(blob)
      enlace.download=nombre
      enlace.click()
      setTimeout(()=>URL.revokeObjectURL(enlace.href),1000)
    })
}

export function LeerArchivo(archivo,maximo=1300000) {
  return new Promise((resolver,rechazar)=>{
    if (!archivo) return rechazar(new Error('Seleccione un archivo'))
    if (archivo.size>maximo) return rechazar(new Error('El archivo supera el tamaño permitido'))
    const lector=new FileReader()
    lector.onerror=()=>rechazar(new Error('No se pudo leer el archivo'))
    lector.onload=()=>{
      const resultado=String(lector.result||'')
      resolver({nombre:archivo.name.slice(0,180),tipo:archivo.type,datos:resultado.split(',')[1]||''})
    }
    lector.readAsDataURL(archivo)
  })
}