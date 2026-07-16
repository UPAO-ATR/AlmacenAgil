-- Migración de una sola vez: reemplaza las categorías de demostración
-- (Papelería, Escritura, Archivo, Oficina) por categorías reales
-- (Papeles, Cartones, Sobres, Otros) y reasigna los productos existentes.
--
-- Este script NO se ejecuta automáticamente. Córrelo una sola vez contra
-- tu base de datos real (Neon) con psql o el editor SQL de Neon.
--
-- No modifica ninguna columna ni tabla, solo datos.

BEGIN;

-- 1. Crear las categorías nuevas si no existen
INSERT INTO categorias(nombre) VALUES
('Papeles'),
('Cartones'),
('Sobres'),
('Otros')
ON CONFLICT DO NOTHING;

-- 2. Reasignar cada producto existente según su tipoproducto
UPDATE productos SET categoriaid=(SELECT id FROM categorias WHERE nombre='Papeles')
WHERE tipoproducto='Papel';

UPDATE productos SET categoriaid=(SELECT id FROM categorias WHERE nombre='Cartones')
WHERE tipoproducto='Cartón';

UPDATE productos SET categoriaid=(SELECT id FROM categorias WHERE nombre='Sobres')
WHERE tipoproducto='Sobres';

UPDATE productos SET categoriaid=(SELECT id FROM categorias WHERE nombre='Otros')
WHERE tipoproducto='Otros';

-- 3. Desactivar los productos de demostración que no encajan en el rubro real
UPDATE productos SET activo=false,actualizadoen=NOW()
WHERE codigo IN ('ESC001','ARC001','OFI001');

-- 4. Borrar las categorías viejas (ya sin productos que las referencien)
DELETE FROM categorias WHERE nombre IN ('Papelería','Escritura','Archivo','Oficina');

-- 5. Verificación: revisa el resultado antes de hacer COMMIT
SELECT c.nombre categoria,COUNT(p.id) productos
FROM categorias c LEFT JOIN productos p ON p.categoriaid=c.id
GROUP BY c.nombre ORDER BY c.nombre;

-- Si el resultado se ve bien, confirma:
COMMIT;
-- Si algo salió mal, en vez de COMMIT ejecuta: ROLLBACK;
