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

  // ─── 3. Rooms — 22 habitaciones (tipos y tarifas según instructivo) ─────
  const roomData: Array<{
    roomNumber: string;
    type: "SINGLE" | "DOUBLE" | "TRIPLE" | "QUADRUPLE" | "PROMOTIONAL";
    pricePerNight: number;
    floor: number;
    hasPrivateBath: boolean;
    maxGuests: number;
  }> = [
    // Single $40.000 — 4 habitaciones
    { roomNumber: "101", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1 },
    { roomNumber: "102", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1 },
    { roomNumber: "103", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1 },
    { roomNumber: "104", type: "SINGLE", pricePerNight: 40_000, floor: 1, hasPrivateBath: true, maxGuests: 1 },
    // Double $60.000 — 6 habitaciones
    { roomNumber: "201", type: "DOUBLE", pricePerNight: 60_000, floor: 2, hasPrivateBath: true, maxGuests: 2 },
    { roomNumber: "202", type: "DOUBLE", pricePerNight: 60_000, floor: 2, hasPrivateBath: true, maxGuests: 2 },
    { roomNumber: "203", type: "DOUBLE", pricePerNight: 60_000, floor: 2, hasPrivateBath: true, maxGuests: 2 },
    { roomNumber: "204", type: "DOUBLE", pricePerNight: 60_000, floor: 2, hasPrivateBath: true, maxGuests: 2 },
    { roomNumber: "205", type: "DOUBLE", pricePerNight: 60_000, floor: 2, hasPrivateBath: true, maxGuests: 2 },
    { roomNumber: "206", type: "DOUBLE", pricePerNight: 60_000, floor: 2, hasPrivateBath: true, maxGuests: 2 },
    // Triple $90.000 — 4 habitaciones
    { roomNumber: "301", type: "TRIPLE", pricePerNight: 90_000, floor: 3, hasPrivateBath: true, maxGuests: 3 },
    { roomNumber: "302", type: "TRIPLE", pricePerNight: 90_000, floor: 3, hasPrivateBath: true, maxGuests: 3 },
    { roomNumber: "303", type: "TRIPLE", pricePerNight: 90_000, floor: 3, hasPrivateBath: true, maxGuests: 3 },
    { roomNumber: "304", type: "TRIPLE", pricePerNight: 90_000, floor: 3, hasPrivateBath: true, maxGuests: 3 },
    // Cuádruple $120.000 — 4 habitaciones
    { roomNumber: "401", type: "QUADRUPLE", pricePerNight: 120_000, floor: 4, hasPrivateBath: true, maxGuests: 4 },
    { roomNumber: "402", type: "QUADRUPLE", pricePerNight: 120_000, floor: 4, hasPrivateBath: true, maxGuests: 4 },
    { roomNumber: "403", type: "QUADRUPLE", pricePerNight: 120_000, floor: 4, hasPrivateBath: true, maxGuests: 4 },
    { roomNumber: "404", type: "QUADRUPLE", pricePerNight: 120_000, floor: 4, hasPrivateBath: true, maxGuests: 4 },
    // Promocional $25.000 p/p, baño compartido, 2-5 personas — 4 habitaciones
    { roomNumber: "501", type: "PROMOTIONAL", pricePerNight: 25_000, floor: 5, hasPrivateBath: false, maxGuests: 5 },
    { roomNumber: "502", type: "PROMOTIONAL", pricePerNight: 25_000, floor: 5, hasPrivateBath: false, maxGuests: 5 },
    { roomNumber: "503", type: "PROMOTIONAL", pricePerNight: 25_000, floor: 5, hasPrivateBath: false, maxGuests: 5 },
    { roomNumber: "504", type: "PROMOTIONAL", pricePerNight: 25_000, floor: 5, hasPrivateBath: false, maxGuests: 5 },
  ];

  for (const r of roomData) {
    await prisma.room.upsert({
      where: {
        establishmentId_roomNumber: { establishmentId: establishment.id, roomNumber: r.roomNumber },
      },
      update: {},
      create: {
        establishmentId: establishment.id,
        ...r,
      },
    });
  }
  console.log("✅ Rooms: 22 habitaciones creadas");

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
