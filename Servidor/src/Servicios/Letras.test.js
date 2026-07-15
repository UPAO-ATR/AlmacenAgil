import assert from 'node:assert/strict'
import test from 'node:test'
import { MontoEnLetras } from './Letras.js'

test('convierte el monto de ejemplo',()=>assert.equal(MontoEnLetras(352.25),'TRESCIENTOS CINCUENTA Y DOS CON 25/100 SOLES'))
test('convierte cero',()=>assert.equal(MontoEnLetras(0),'CERO CON 00/100 SOLES'))
test('convierte uno exacto',()=>assert.equal(MontoEnLetras(1),'UNO CON 00/100 SOLES'))
test('aplica apócope en veintiuno',()=>assert.equal(MontoEnLetras(21000),'VEINTIÚN MIL CON 00/100 SOLES'))
test('aplica apócope compuesta',()=>assert.equal(MontoEnLetras(121000),'CIENTO VEINTIÚN MIL CON 00/100 SOLES'))
test('mil exacto sin "uno"',()=>assert.equal(MontoEnLetras(1000),'MIL CON 00/100 SOLES'))
test('cien exacto',()=>assert.equal(MontoEnLetras(100),'CIEN CON 00/100 SOLES'))
test('ciento uno',()=>assert.equal(MontoEnLetras(101),'CIENTO UNO CON 00/100 SOLES'))
test('un millón singular',()=>assert.equal(MontoEnLetras(1000000),'UN MILLÓN CON 00/100 SOLES'))
test('millones plural',()=>assert.equal(MontoEnLetras(2000000),'DOS MILLONES CON 00/100 SOLES'))
test('millón y mil combinados',()=>assert.equal(MontoEnLetras(1001000),'UN MILLÓN MIL CON 00/100 SOLES'))
test('treinta y uno sin acento',()=>assert.equal(MontoEnLetras(31000),'TREINTA Y UN MIL CON 00/100 SOLES'))
test('redondea centavos correctamente',()=>assert.equal(MontoEnLetras(9.999),'DIEZ CON 00/100 SOLES'))
