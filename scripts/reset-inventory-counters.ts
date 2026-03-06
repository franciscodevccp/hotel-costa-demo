/**
 * Script para poner Entradas y Salidas en 0 en todo el inventario.
 * Borra todos los movimientos del establecimiento y limpia últ. entrada/salida.
 * El stock de cada producto NO se modifica.
 *
 * Uso (desde la raíz del proyecto):
 *   pnpm run script:reset-inventory-counters
 *   pnpm run script:reset-inventory-counters -- --establishment-id=clxxx...
 *
 * En el VPS, después de git pull:
 *   cd /var/www/hotel-costa-demo && pnpm run script:reset-inventory-counters
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en .env");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const establishmentIdArg = process.argv.find((a) => a.startsWith("--establishment-id="));
  const establishmentId = establishmentIdArg?.split("=")[1]?.trim();

  let establishmentIds: string[];

  if (establishmentId) {
    const one = await prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { id: true },
    });
    if (!one) {
      console.error("Establecimiento no encontrado:", establishmentId);
      process.exit(1);
    }
    establishmentIds = [one.id];
  } else {
    const all = await prisma.establishment.findMany({ select: { id: true } });
    establishmentIds = all.map((e: { id: string }) => e.id);
    if (establishmentIds.length === 0) {
      console.log("No hay establecimientos en la base de datos.");
      return;
    }
    if (establishmentIds.length > 1) {
      console.log("Varios establecimientos encontrados. Se aplicará el reseteo a todos.");
    }
  }

  for (const eid of establishmentIds) {
    const productIds = await prisma.inventoryProduct.findMany({
      where: { establishmentId: eid },
      select: { id: true },
    }).then((rows: { id: string }[]) => rows.map((r: { id: string }) => r.id));

    if (productIds.length === 0) {
      console.log(`Establecimiento ${eid}: sin productos, nada que resetear.`);
      continue;
    }

    const deletedMovements = await prisma.inventoryMovement.deleteMany({
      where: { productId: { in: productIds } },
    });

    await prisma.inventoryProduct.updateMany({
      where: { id: { in: productIds } },
      data: { lastEntryAt: null, lastExitAt: null },
    });

    console.log(`Establecimiento ${eid}: ${deletedMovements.count} movimiento(s) eliminados, ${productIds.length} producto(s) actualizados (entradas/salidas en 0).`);
  }

  console.log("Listo. Entradas y Salidas quedaron en 0; el stock de cada producto no cambió.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
