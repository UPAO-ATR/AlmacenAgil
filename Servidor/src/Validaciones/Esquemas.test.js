import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EsquemaActivacion,
  EsquemaAuditoria,
  EsquemaConfirmacion,
  EsquemaCotizacion,
  EsquemaEmpresa,
  EsquemaPagoProveedor,
  EsquemaProducto,
  EsquemaProveedor,
  EsquemaProveedorProducto,
  EsquemaRecepcion,
  EsquemaUsuario
} from './Esquemas.js'

const UsuarioValido={nombres:'Ana',apellidos:'Ruiz',dni:'12345678',correo:'ANA@CORREO.PE',rol:'Administrador'}
const CotizacionValida={cliente:'Empresa Uno',ruc:'20601234567',telefono:'987654321',correo:'VENTAS@EMPRESA.PE',productos:[{productoid:1,cantidad:2}]}
const ProductoValido={codigo:'pap001',nombre:'Papel Bond',descripcion:'Resma',categoriaid:1,tipoproducto:'Papel',material:'Bond',grosor:'75 g',dimensiones:'A4',maximopedido:100,precioventa:20,preciocompra:15,descuentoventa:5,descuentocompra:0,stockactual:10,stockminimo:5,stockmensual:20,imagen:''}
const ProveedorProductoValido={productoid:1,preciohabitual:20,descuentolanzamiento:10,diasentrega:3,pedidosanteriores:2,puntaje:4.5}
const ArchivoValido={nombre:'pago.pdf',tipo:'application/pdf',datos:Buffer.from('%PDF-prueba').toString('base64')}

test('rechaza dni con letras',()=>assert.equal(EsquemaUsuario.safeParse({...UsuarioValido,dni:'12AB5678'}).success,false))
test('normaliza correo de usuario',()=>assert.equal(EsquemaUsuario.parse(UsuarioValido).correo,'ana@correo.pe'))
test('rechaza campos adicionales de usuario',()=>assert.equal(EsquemaUsuario.safeParse({...UsuarioValido,administrador:true}).success,false))
test('rechaza cotizacion vacia',()=>assert.equal(EsquemaCotizacion.safeParse({...CotizacionValida,productos:[]}).success,false))
test('rechaza productos repetidos',()=>assert.equal(EsquemaCotizacion.safeParse({...CotizacionValida,productos:[{productoid:1,cantidad:1},{productoid:1,cantidad:2}]}).success,false))
test('normaliza correo de cotizacion',()=>assert.equal(EsquemaCotizacion.parse(CotizacionValida).correo,'ventas@empresa.pe'))
test('normaliza codigo de producto',()=>assert.equal(EsquemaProducto.parse(ProductoValido).codigo,'PAP001'))
test('rechaza descuento mayor a cien',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,descuentoventa:101}).success,false))
test('rechaza máximo de pedido inválido',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,maximopedido:0}).success,false))
test('rechaza tipo de producto desconocido',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,tipoproducto:'Vidrio'}).success,false))
test('rechaza imagen externa',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,imagen:'https://sitio.test/a.png'}).success,false))
test('rechaza ruc incompleto',()=>assert.equal(EsquemaProveedor.safeParse({razonsocial:'Proveedor Uno',ruc:'2060123456',contacto:'Ana Ruiz',telefono:'987654321',correo:'ventas@proveedor.pe',ubicacion:'Trujillo'}).success,false))
test('acepta descuento de lanzamiento',()=>assert.equal(EsquemaProveedorProducto.safeParse(ProveedorProductoValido).success,true))
test('rechaza descuento de lanzamiento mayor a cien',()=>assert.equal(EsquemaProveedorProducto.safeParse({...ProveedorProductoValido,descuentolanzamiento:101}).success,false))
test('rechaza puntaje fuera de rango',()=>assert.equal(EsquemaProveedorProducto.safeParse({...ProveedorProductoValido,puntaje:6}).success,false))
test('rechaza codigo de activacion incompleto',()=>assert.equal(EsquemaActivacion.safeParse({correo:'a@b.pe',codigo:'12345',clavetemporal:'Temporal2026!',clavenueva:'NuevaSegura2026!'}).success,false))
test('acepta archivo permitido',()=>assert.equal(EsquemaPagoProveedor.safeParse({archivo:ArchivoValido,observacion:''}).success,true))
test('rechaza recepcion negativa',()=>assert.equal(EsquemaRecepcion.safeParse({reabastecimientoid:1,recibida:-1,faltantes:0,defectuosos:0,observacion:'Prueba'}).success,false))
test('rechaza productos repetidos en auditoria',()=>assert.equal(EsquemaAuditoria.safeParse({observacion:'Conteo',productos:[{productoid:1,stockcontado:5},{productoid:1,stockcontado:6}]}).success,false))

test('rechaza stock mayor a mil',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,stockactual:1001}).success,false))
test('rechaza máximo de pedido mayor a mil',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,maximopedido:1001}).success,false))
test('rechaza cotización con cantidad mayor a mil',()=>assert.equal(EsquemaCotizacion.safeParse({...CotizacionValida,productos:[{productoid:1,cantidad:1001}]}).success,false))
test('rechaza recepción total mayor a mil',()=>assert.equal(EsquemaRecepcion.safeParse({reabastecimientoid:1,recibida:700,faltantes:200,defectuosos:200,observacion:'Prueba'}).success,false))
test('acepta datos de emisión válidos',()=>assert.equal(EsquemaEmpresa.safeParse({nombrecomercial:'ELIM-A',razonsocial:'ELIM-A',ruc:'20123456789',direccion:'Trujillo',telefono:'987654321',correo:'ventas@almacenagil.pe',serie:'FI01'}).success,true))

test('acepta confirmación explícita',()=>assert.equal(EsquemaConfirmacion.safeParse({confirmacion:true}).success,true))
test('rechaza acción administrativa sin confirmación',()=>assert.equal(EsquemaConfirmacion.safeParse({confirmacion:false}).success,false))
test('rechaza campos extra en acción administrativa',()=>assert.equal(EsquemaConfirmacion.safeParse({confirmacion:true,forzar:true}).success,false))