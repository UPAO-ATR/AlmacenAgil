import { BaseDatos } from '../BaseDatos.js'

export async function RegistrarAuditoria(usuarioid,accion,entidad,entidadid,detalle,direccionip,cliente=BaseDatos) {
  await cliente.query(
    `INSERT INTO auditoriaacciones(usuarioid,accion,entidad,entidadid,detalle,direccionip)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [usuarioid||null,accion,entidad,String(entidadid??''),detalle||{},direccionip||null]
  )
}