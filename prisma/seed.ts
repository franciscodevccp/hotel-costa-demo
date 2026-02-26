/**
 * Seed inicial — Hotel de la Costa
 * 1 Establishment, 2 Users, 22 Rooms, 7 Suppliers, ~100 productos de inventario
 * Ejecutar: pnpm prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = "HotelCosta2026"; // Cambiar en producción

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── 1. Establishment ───────────────────────────────────────────────────
  const establishment = await prisma.establishment.upsert({
    where: { id: "est-hotel-costa" },
    update: {},
    create: {
      id: "est-hotel-costa",
      name: "Hotel de la Costa",
      address: "Talcahuano, Región del Biobío",
      phone: "+56 41 234 5678",
      email: "contacto@hoteldelacosta.cl",
      totalRooms: 22,
    },
  });
  console.log("✅ Establishment:", establishment.name);

  // ─── 2. Users (bcrypt 12 rounds) ────────────────────────────────────────
  const passwordHash = await hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@hoteldelacosta.cl" },
    update: {},
    create: {
      establishmentId: establishment.id,
      fullName: "Administrador",
      email: "admin@hoteldelacosta.cl",
      passwordHash,
      role: "ADMIN",
    },
  });
  const recepcionista = await prisma.user.upsert({
    where: { email: "recepcionista@hoteldelacosta.cl" },
    update: {},
    create: {
      establishmentId: establishment.id,
      fullName: "Recepcionista",
      email: "recepcionista@hoteldelacosta.cl",
      passwordHash,
      role: "RECEPTIONIST",
    },
  });
  console.log("✅ Users: admin + recepcionista (password:", DEFAULT_PASSWORD + ")");

  // ─── 3. Rooms — 22 habitaciones reales (MotoPress / WordPress) ─────────
  // Eliminar habitaciones viejas (101, 102, 201, 301, 401, etc.) que ya no usamos
  const validRoomNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"];
  const oldRooms = await prisma.room.findMany({
    where: {
      establishmentId: establishment.id,
      roomNumber: { notIn: validRoomNumbers },
    },
    select: { id: true },
  });
  const oldRoomIds = oldRooms.map((r) => r.id);
  if (oldRoomIds.length > 0) {
    await prisma.payment.deleteMany({ where: { reservation: { roomId: { in: oldRoomIds } } } });
    await prisma.reservation.deleteMany({ where: { roomId: { in: oldRoomIds } } });
    await prisma.room.deleteMany({ where: { id: { in: oldRoomIds } } });
    console.log("✅ Habitaciones antiguas eliminadas:", oldRoomIds.length);
  }

  // externalId = ID de la acomodación en MotoPress para sincronizar reservas
  const roomData: Array<{
    roomNumber: string;
    type: "SINGLE" | "DOUBLE" | "TRIPLE" | "QUADRUPLE" | "QUINTUPLE" | "PROMOTIONAL";
    pricePerNight: number;
    floor: number;
    hasPrivateBath: boolean;
    maxGuests: number;
    externalId: string;
  }> = [
    { roomNumber: "1", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1, externalId: "401" },
    { roomNumber: "2", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1, externalId: "39" },
    { roomNumber: "3", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1, externalId: "42" },
    { roomNumber: "4", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1, externalId: "259" },
    { roomNumber: "5", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1, externalId: "45" },
    { roomNumber: "6", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1, externalId: "262" },
    { roomNumber: "7", type: "QUINTUPLE", pricePerNight: 150_000, floor: 1, hasPrivateBath: true, maxGuests: 5, externalId: "48" },
    { roomNumber: "8", type: "TRIPLE", pricePerNight: 90_000, floor: 1, hasPrivateBath: true, maxGuests: 3, externalId: "51" },
    { roomNumber: "9", type: "DOUBLE", pricePerNight: 60_000, floor: 1, hasPrivateBath: true, maxGuests: 2, externalId: "265" },
    { roomNumber: "10", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1, externalId: "272" },
    { roomNumber: "11", type: "DOUBLE", pricePerNight: 60_000, floor: 1, hasPrivateBath: true, maxGuests: 2, externalId: "275" },
    { roomNumber: "12", type: "DOUBLE", pricePerNight: 60_000, floor: 1, hasPrivateBath: true, maxGuests: 2, externalId: "279" },
    { roomNumber: "13", type: "DOUBLE", pricePerNight: 60_000, floor: 1, hasPrivateBath: true, maxGuests: 2, externalId: "282" },
    { roomNumber: "14", type: "QUADRUPLE", pricePerNight: 120_000, floor: 1, hasPrivateBath: true, maxGuests: 4, externalId: "289" },
    { roomNumber: "15", type: "QUADRUPLE", pricePerNight: 120_000, floor: 1, hasPrivateBath: true, maxGuests: 4, externalId: "286" },
    { roomNumber: "16", type: "TRIPLE", pricePerNight: 90_000, floor: 1, hasPrivateBath: true, maxGuests: 3, externalId: "292" },
    { roomNumber: "17", type: "TRIPLE", pricePerNight: 90_000, floor: 1, hasPrivateBath: true, maxGuests: 3, externalId: "295" },
    { roomNumber: "18", type: "DOUBLE", pricePerNight: 60_000, floor: 1, hasPrivateBath: true, maxGuests: 2, externalId: "421" },
    { roomNumber: "19", type: "QUINTUPLE", pricePerNight: 150_000, floor: 1, hasPrivateBath: true, maxGuests: 5, externalId: "392" },
    { roomNumber: "20", type: "QUADRUPLE", pricePerNight: 120_000, floor: 1, hasPrivateBath: true, maxGuests: 4, externalId: "404" },
    { roomNumber: "21", type: "QUINTUPLE", pricePerNight: 150_000, floor: 1, hasPrivateBath: true, maxGuests: 5, externalId: "409" },
    { roomNumber: "22", type: "DOUBLE", pricePerNight: 60_000, floor: 1, hasPrivateBath: true, maxGuests: 2, externalId: "418" },
  ];

  for (const r of roomData) {
    await prisma.room.upsert({
      where: {
        establishmentId_roomNumber: { establishmentId: establishment.id, roomNumber: r.roomNumber },
      },
      update: { type: r.type, maxGuests: r.maxGuests, externalId: r.externalId, pricePerNight: r.pricePerNight },
      create: {
        establishmentId: establishment.id,
        ...r,
      },
    });
  }
  console.log("✅ Rooms: 22 habitaciones (MotoPress externalId asignados)");

  // ─── 4. Suppliers — 7 proveedores ───────────────────────────────────────
  const supplierNames = [
    "Proveedor Aseo y Limpieza",
    "Distribuidora de Alimentos",
    "Ropa de Cama y Textiles",
    "Bebidas y Cafetería",
    "Artículos de Higiene",
    "Servicios de Mantenimiento",
    "Suministros de Oficina",
  ];
  await prisma.supplier.deleteMany({ where: { establishmentId: establishment.id } });
  await prisma.supplier.createMany({
    data: supplierNames.map((name) => ({ establishmentId: establishment.id, name })),
  });
  console.log("✅ Suppliers: 7 proveedores creados");

  // ─── 5. Inventory products — ~100 productos por categoría ───────────────
  const productCategories: Record<string, Array<[string, string, number]>> = {
    Aseo: [
      ["Jabón de tocador", "unidad", 20],
      ["Papel higiénico", "rollo", 15],
      ["Shampoo", "unidad", 20],
      ["Toalla de mano", "unidad", 30],
      ["Toalla grande", "unidad", 30],
      ["Escobilla inodoro", "unidad", 10],
      ["Bolsa de basura", "unidad", 50],
      ["Detergente líquido", "litro", 10],
      ["Desinfectante", "litro", 8],
      ["Esponja multiuso", "unidad", 25],
      ["Guantes de limpieza", "unidad", 20],
      ["Trapeador", "unidad", 5],
      ["Recogedor", "unidad", 5],
      ["Cubo", "unidad", 5],
      ["Ambientador", "unidad", 15],
    ],
    "Ropa de cama": [
      ["Sábana bajera", "unidad", 25],
      ["Sábana encimera", "unidad", 25],
      ["Funda de almohada", "unidad", 30],
      ["Cobertor", "unidad", 15],
      ["Manta", "unidad", 15],
      ["Colchón protector", "unidad", 10],
    ],
    Desayuno: [
      ["Café molido", "kg", 10],
      ["Té negro", "caja", 15],
      ["Té verde", "caja", 15],
      ["Azúcar", "kg", 20],
      ["Edulcorante", "unidad", 20],
      ["Leche UHT", "litro", 30],
      ["Pan de molde", "unidad", 20],
      ["Mantequilla", "unidad", 15],
      ["Mermelada", "frasco", 10],
      ["Cereal", "bolsa", 15],
      ["Jugo de naranja", "litro", 20],
      ["Yogurt", "unidad", 30],
      ["Fruta fresca", "kg", 10],
      ["Queso laminado", "unidad", 15],
      ["Jamón", "kg", 5],
    ],
    Bebidas: [
      ["Agua mineral", "unidad", 50],
      ["Bebida", "unidad", 30],
      ["Cerveza", "unidad", 24],
      ["Vino tinto", "botella", 12],
      ["Vino blanco", "botella", 12],
    ],
    "Artículos de baño": [
      ["Peine", "unidad", 20],
      ["Cepillo de dientes", "unidad", 25],
      ["Pasta dental", "unidad", 15],
      ["Enjuague bucal", "unidad", 10],
      ["Crema de afeitar", "unidad", 15],
      ["Toalla desmaquillante", "unidad", 30],
    ],
    Oficina: [
      ["Papel A4", "resma", 10],
      ["Bolígrafo", "unidad", 50],
      ["Carpeta", "unidad", 20],
      ["Grapas", "caja", 5],
      ["Sobre", "unidad", 30],
    ],
    Mantenimiento: [
      ["Bombillo", "unidad", 20],
      ["Pila", "unidad", 30],
      ["Cinta adhesiva", "unidad", 15],
      ["Destornillador", "unidad", 5],
      ["Llave inglesa", "unidad", 3],
    ],
  };

  // Eliminar en orden: ítems de facturas y movimientos referencian a productos
  await prisma.invoiceItem.deleteMany({
    where: { invoice: { establishmentId: establishment.id } },
  });
  await prisma.inventoryMovement.deleteMany({
    where: { product: { establishmentId: establishment.id } },
  });
  await prisma.inventoryProduct.deleteMany({ where: { establishmentId: establishment.id } });
  let count = 0;
  for (const [category, items] of Object.entries(productCategories)) {
    for (const [name, unit, minStock] of items) {
      await prisma.inventoryProduct.create({
        data: {
          establishmentId: establishment.id,
          name,
          category,
          unit,
          minStock,
          stock: minStock + Math.floor(Math.random() * 20),
        },
      });
      count++;
    }
  }
  console.log("✅ Inventory products:", count, "productos creados");

  console.log("\n🎉 Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
