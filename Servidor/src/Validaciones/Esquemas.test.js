import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EsquemaActivacion,
  EsquemaAuditoria,
  EsquemaCotizacion,
  EsquemaPagoProveedor,
  EsquemaProducto,
  EsquemaProveedor,
  EsquemaProveedorProducto,
  EsquemaRecepcion,
  EsquemaUsuario
} from './Esquemas.js'

const UsuarioValido={nombres:'Ana',apellidos:'Ruiz',dni:'12345678',correo:'ANA@CORREO.PE',rol:'Administrador'}
const CotizacionValida={cliente:'Empresa Uno',ruc:'20601234567',telefono:'987654321',correo:'VENTAS@EMPRESA.PE',productos:[{productoid:1,cantidad:2}]}
const ProductoValido={codigo:'pap001',nombre:'Papel Bond',descripcion:'Resma',categoriaid:1,precioventa:20,preciocompra:15,descuentoventa:5,descuentocompra:0,stockactual:10,stockminimo:5,stockmensual:20,imagen:''}

const ArchivoValido={nombre:'pago.pdf',tipo:'application/pdf',datos:Buffer.from('%PDF-prueba').toString('base64')}

test('rechaza dni con letras',()=>assert.equal(EsquemaUsuario.safeParse({...UsuarioValido,dni:'12AB5678'}).success,false))
test('normaliza correo de usuario',()=>assert.equal(EsquemaUsuario.parse(UsuarioValido).correo,'ana@correo.pe'))
test('rechaza campos adicionales de usuario',()=>assert.equal(EsquemaUsuario.safeParse({...UsuarioValido,administrador:true}).success,false))
test('rechaza cotizacion vacia',()=>assert.equal(EsquemaCotizacion.safeParse({...CotizacionValida,productos:[]}).success,false))
test('rechaza productos repetidos',()=>assert.equal(EsquemaCotizacion.safeParse({...CotizacionValida,productos:[{productoid:1,cantidad:1},{productoid:1,cantidad:2}]}).success,false))
test('normaliza correo de cotizacion',()=>assert.equal(EsquemaCotizacion.parse(CotizacionValida).correo,'ventas@empresa.pe'))
test('normaliza codigo de producto',()=>assert.equal(EsquemaProducto.parse(ProductoValido).codigo,'PAP001'))
test('rechaza descuento mayor a cien',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,descuentoventa:101}).success,false))
test('rechaza imagen externa',()=>assert.equal(EsquemaProducto.safeParse({...ProductoValido,imagen:'https://sitio.test/a.png'}).success,false))
test('rechaza ruc incompleto',()=>assert.equal(EsquemaProveedor.safeParse({razonsocial:'Proveedor Uno',ruc:'2060123456',contacto:'Ana Ruiz',telefono:'987654321',correo:'ventas@proveedor.pe',ubicacion:'Trujillo'}).success,false))
test('rechaza puntaje fuera de rango',()=>assert.equal(EsquemaProveedorProducto.safeParse({productoid:1,preciohabitual:20,diasentrega:3,pedidosanteriores:2,puntaje:6}).success,false))
test('rechaza codigo de activacion incompleto',()=>assert.equal(EsquemaActivacion.safeParse({correo:'a@b.pe',codigo:'12345',clavetemporal:'Temporal2026!',clavenueva:'NuevaSegura2026!'}).success,false))
test('acepta archivo permitido',()=>assert.equal(EsquemaPagoProveedor.safeParse({archivo:ArchivoValido,observacion:''}).success,true))
test('rechaza recepcion negativa',()=>assert.equal(EsquemaRecepcion.safeParse({reabastecimientoid:1,recibida:-1,faltantes:0,defectuosos:0,observacion:'Prueba'}).success,false))
test('rechaza productos repetidos en auditoria',()=>assert.equal(EsquemaAuditoria.safeParse({observacion:'Conteo',productos:[{productoid:1,stockcontado:5},{productoid:1,stockcontado:6}]}).success,false))