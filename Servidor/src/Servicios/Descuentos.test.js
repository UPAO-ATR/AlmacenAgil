import test from 'node:test'
import assert from 'node:assert/strict'
import { CalcularDescuentoTotal,CalcularSubtotal,ObtenerDescuentoVolumen } from './Descuentos.js'

test('aplica tramos de volumen',()=>{
  assert.equal(ObtenerDescuentoVolumen(4),0)
  assert.equal(ObtenerDescuentoVolumen(5),10)
  assert.equal(ObtenerDescuentoVolumen(11),15)
  assert.equal(ObtenerDescuentoVolumen(21),20)
})

test('suma descuento fijo y volumen',()=>{
  assert.deepEqual(CalcularDescuentoTotal(10,5),{fijo:10,volumen:10,total:20})
})

test('calcula subtotal final',()=>{
  assert.equal(CalcularSubtotal(20,10,10),180)
})