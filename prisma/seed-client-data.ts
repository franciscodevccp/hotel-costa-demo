/**
 * Migración de datos del cliente — Hotel de la Costa
 * Importa proveedores, productos de inventario (con movimientos) y facturas/boletas
 * desde el export de Notion en public/inventario-facturas-todo/
 *
 * Ejecutar: npx tsx prisma/seed-client-data.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import sharp from "sharp";

const prisma = new PrismaClient();
const ESTABLISHMENT_ID = "est-hotel-costa";
const DATA_DIR = path.join(process.cwd(), "public", "inventario-facturas-todo");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "invoices");
const WEBP_QUALITY = 85;

// ─── CSV Parser simple (soporta campos con comillas y comas internas) ─────
function parseCSV(content: string): Record<string, string>[] {
    const lines = content.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j].trim()] = (values[j] ?? "").trim();
        }
        rows.push(row);
    }
    return rows;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const PLACEHOLDER_EMAILS = ["EMAIL@example.com", "email@example.com", ""];
const PLACEHOLDER_PHONES = ["(555) 891-1234", ""];

function cleanEmail(email: string | undefined): string | null {
    if (!email) return null;
    return PLACEHOLDER_EMAILS.includes(email.trim()) ? null : email.trim();
}

function cleanPhone(phone: string | undefined): string | null {
    if (!phone) return null;
    return PLACEHOLDER_PHONES.includes(phone.trim()) ? null : phone.trim();
}

/** Parsea fechas en español como "15 de diciembre de 2025" → Date */
function parseSpanishDate(dateStr: string): Date {
    const months: Record<string, number> = {
        enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
        julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    };
    const match = dateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
    if (!match) return new Date();
    const day = parseInt(match[1]);
    const month = months[match[2].toLowerCase()] ?? 0;
    const year = parseInt(match[3]);
    return new Date(year, month, day);
}

/** Extrae el nombre del proveedor desde el campo CSV (limpia refs Notion) */
function extractSupplierName(raw: string): string | null {
    if (!raw) return null;
    // Formato: "Nombre Proveedor (URL_encoded.md)"
    const match = raw.match(/^(.+?)\s*\(/);
    return match ? match[1].trim() : raw.trim();
}

/** Determina tipo y folio normalizado desde el campo N° FACTURA */
function parseInvoiceFolio(raw: string): { type: "FACTURA" | "BOLETA" | "GUIA_DESPACHO" | "COTIZACION"; folio: string } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Excluir pagos de servicios
    if (trimmed.startsWith("Pago ")) return null;

    // Boleta N XXXXX
    const boletaMatch = trimmed.match(/^Boleta\s+N\s+(.+)$/i);
    if (boletaMatch) return { type: "BOLETA", folio: `B-${boletaMatch[1].trim()}` };

    // Cotizacion N XXXXX (se importa como FACTURA)
    const cotMatch = trimmed.match(/^Cotizacion\s+N\s+(.+)$/i);
    if (cotMatch) return { type: "COTIZACION", folio: `COT-${cotMatch[1].trim()}` };

    // Guía/Guia de despacho N XXXXX
    const guiaMatch = trimmed.match(/^Gu[ií]a\s+de\s+despacho\s+N\s+(.+)$/i);
    if (guiaMatch) return { type: "GUIA_DESPACHO", folio: `GD-${guiaMatch[1].trim()}` };

    // Factura N XXXXX
    const facturaMatch = trimmed.match(/^Factura\s+N\s+(.+)$/i);
    if (facturaMatch) return { type: "FACTURA", folio: `F-${facturaMatch[1].trim()}` };

    // Factura XXXXX (sin N)
    const facturaShort = trimmed.match(/^Factura\s+(.+)$/i);
    if (facturaShort) return { type: "FACTURA", folio: `F-${facturaShort[1].trim()}` };

    return null;
}

/** Convierte una imagen a WebP y la guarda en UPLOAD_DIR */
async function convertToWebP(sourceFilename: string): Promise<string | null> {
    // Limpiar URL encoding si existe
    const cleanName = decodeURIComponent(sourceFilename.trim());
    const sourcePath = path.join(DATA_DIR, cleanName);

    if (!existsSync(sourcePath)) {
        console.warn(`  ⚠ Archivo no encontrado: ${cleanName}`);
        return null;
    }

    // Si es PDF, no podemos convertirlo
    if (cleanName.toLowerCase().endsWith(".pdf")) {
        console.warn(`  ⚠ PDF no se puede convertir a WebP: ${cleanName}`);
        return null;
    }

    try {
        const baseName = path
            .basename(cleanName, path.extname(cleanName))
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .toLowerCase();
        const webpName = `${baseName}.webp`;
        const destPath = path.join(UPLOAD_DIR, webpName);

        // Si ya existe, no reconvertir
        if (existsSync(destPath)) {
            return `/uploads/invoices/${webpName}`;
        }

        const buffer = readFileSync(sourcePath);
        const webpBuffer = await sharp(buffer).webp({ quality: WEBP_QUALITY }).toBuffer();

        const { writeFileSync } = await import("fs");
        writeFileSync(destPath, webpBuffer);
        return `/uploads/invoices/${webpName}`;
    } catch (err) {
        console.warn(`  ⚠ Error convirtiendo ${cleanName}:`, (err as Error).message);
        return null;
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
    console.log("🚀 Iniciando migración de datos del cliente...\n");

    // Asegurar directorio de uploads
    mkdirSync(UPLOAD_DIR, { recursive: true });

    // ═══ 1. PROVEEDORES ══════════════════════════════════════════════════════
    console.log("📦 1/5 — Importando proveedores...");

    const suppliersCSV = readFileSync(
        path.join(DATA_DIR, "Suppliers 296d130d394e81d3bed0c57b34398de2_all.csv"),
        "utf-8"
    );
    const supplierRows = parseCSV(suppliersCSV);
    const supplierMap = new Map<string, string>(); // nombre → id

    for (const row of supplierRows) {
        const name = row["Name"]?.trim();
        if (!name) continue;

        const existing = await prisma.supplier.findFirst({
            where: { establishmentId: ESTABLISHMENT_ID, name },
        });

        if (existing) {
            supplierMap.set(name, existing.id);
            console.log(`  ✓ ${name} (ya existía)`);
            continue;
        }

        const supplier = await prisma.supplier.create({
            data: {
                establishmentId: ESTABLISHMENT_ID,
                name,
                phone: cleanPhone(row["Phone"]),
                email: cleanEmail(row["Email"]),
            },
        });
        supplierMap.set(name, supplier.id);
        console.log(`  ✅ ${name}`);
    }
    console.log(`  → ${supplierMap.size} proveedores\n`);

    // ═══ 2. PRODUCTOS DE INVENTARIO ══════════════════════════════════════════
    console.log("📦 2/5 — Importando productos de inventario...");

    const productsCSV = readFileSync(
        path.join(DATA_DIR, "Products 296d130d394e816ea114e2505ba466c6_all.csv"),
        "utf-8"
    );
    const productRows = parseCSV(productsCSV);
    let productCount = 0;
    let movementCount = 0;

    for (const row of productRows) {
        const name = row["Producto"]?.trim();
        if (!name) continue;

        const category = row["Categoría"]?.trim() || "Bodega";
        const stock = parseInt(row["STOCK"]) || 0;
        const entry = parseInt(row["Ingreso de mercaderia"]) || 0;
        const exit = parseInt(row["Salida de mercadería"]) || 0;
        const supplierName = extractSupplierName(row["Proveedor"]);

        // minStock: 20% del stock, mínimo 1
        const minStock = Math.max(1, Math.round(stock * 0.2));

        // Verificar si ya existe
        const existing = await prisma.inventoryProduct.findFirst({
            where: { establishmentId: ESTABLISHMENT_ID, name },
        });
        if (existing) {
            console.log(`  ✓ ${name} (ya existe)`);
            continue;
        }

        const product = await prisma.inventoryProduct.create({
            data: {
                establishmentId: ESTABLISHMENT_ID,
                name,
                category,
                stock,
                minStock,
                unit: "unidad",
            },
        });
        productCount++;

        // Crear movimientos de entrada
        if (entry > 0) {
            await prisma.inventoryMovement.create({
                data: {
                    productId: product.id,
                    type: "ENTRY",
                    quantity: entry,
                    note: "Importación inicial — datos del cliente",
                },
            });
            movementCount++;
        }

        // Crear movimientos de salida
        if (exit > 0) {
            await prisma.inventoryMovement.create({
                data: {
                    productId: product.id,
                    type: "EXIT",
                    quantity: exit,
                    note: "Importación inicial — datos del cliente",
                },
            });
            movementCount++;
        }

        console.log(
            `  ✅ ${name} | ${category} | stock: ${stock} | min: ${minStock}${entry ? ` | +${entry}` : ""}${exit ? ` | -${exit}` : ""}`
        );
    }
    console.log(`  → ${productCount} productos, ${movementCount} movimientos\n`);

    // ═══ 3. CONVERSIÓN DE FOTOS ═══════════════════════════════════════════════
    console.log("📸 3/5 — Convirtiendo fotos a WebP...");

    const facturasCSV = readFileSync(
        path.join(DATA_DIR, "FACTURAS Y BOLETAS 2c4d130d394e8030b330d21e21518c0e_all.csv"),
        "utf-8"
    );
    const invoiceRows = parseCSV(facturasCSV);

    // Recolectar todos los nombres de foto
    const allPhotos = new Set<string>();
    for (const row of invoiceRows) {
        const detalle = row["Detalle de compra"]?.trim();
        if (!detalle) continue;
        // Puede tener múltiples fotos separadas por coma
        const photos = detalle.split(",").map((p) => p.trim()).filter(Boolean);
        for (const photo of photos) {
            allPhotos.add(photo);
        }
    }

    console.log(`  Encontradas ${allPhotos.size} referencias a fotos`);
    const photoUrlMap = new Map<string, string>(); // original → webp url
    let convertedCount = 0;

    for (const photo of allPhotos) {
        const url = await convertToWebP(photo);
        if (url) {
            photoUrlMap.set(photo, url);
            convertedCount++;
        }
    }
    console.log(`  → ${convertedCount} fotos convertidas a WebP\n`);

    // ═══ 4. FACTURAS Y BOLETAS ════════════════════════════════════════════════
    console.log("🧾 4/5 — Importando facturas y boletas...");
    let invoiceCount = 0;

    for (const row of invoiceRows) {
        const rawFolio = row["N° FACTURA"]?.trim();
        if (!rawFolio) continue;

        const parsed = parseInvoiceFolio(rawFolio);
        if (!parsed) {
            console.log(`  ⊘ Excluido: ${rawFolio}`);
            continue;
        }

        const { type, folio } = parsed;

        // Verificar si ya existe
        const existing = await prisma.invoice.findFirst({
            where: { establishmentId: ESTABLISHMENT_ID, folio },
        });
        if (existing) {
            console.log(`  ✓ ${folio} (ya existe)`);
            continue;
        }

        // Parsear fecha
        const fechaStr = row["FECHA COMPRA"]?.trim();
        const date = fechaStr ? parseSpanishDate(fechaStr) : new Date();

        // Resolver fotos
        const detalle = row["Detalle de compra"]?.trim();
        const photoUrls: string[] = [];
        if (detalle) {
            const photos = detalle.split(",").map((p) => p.trim()).filter(Boolean);
            for (const photo of photos) {
                const url = photoUrlMap.get(photo);
                if (url) photoUrls.push(url);
            }
        }

        await prisma.invoice.create({
            data: {
                establishmentId: ESTABLISHMENT_ID,
                folio,
                type,
                date,
                total: 0, // Sin montos en los datos del cliente
                photoUrls,
                syncedInventory: false,
            },
        });
        invoiceCount++;
        console.log(
            `  ✅ ${folio} | ${type} | ${fechaStr || "sin fecha"} | ${photoUrls.length} foto(s)`
        );
    }
    console.log(`  → ${invoiceCount} facturas/boletas importadas\n`);

    // ═══ 5. RESUMEN ═══════════════════════════════════════════════════════════
    console.log("📊 5/5 — Verificando datos migrados...");
    const counts = await Promise.all([
        prisma.supplier.count({ where: { establishmentId: ESTABLISHMENT_ID } }),
        prisma.inventoryProduct.count({ where: { establishmentId: ESTABLISHMENT_ID } }),
        prisma.inventoryMovement.count({
            where: { product: { establishmentId: ESTABLISHMENT_ID } },
        }),
        prisma.invoice.count({ where: { establishmentId: ESTABLISHMENT_ID } }),
    ]);

    console.log(`\n🎉 Migración completada:`);
    console.log(`   Proveedores:  ${counts[0]}`);
    console.log(`   Productos:    ${counts[1]}`);
    console.log(`   Movimientos:  ${counts[2]}`);
    console.log(`   Facturas:     ${counts[3]}`);
    console.log(`   Fotos WebP:   ${convertedCount}`);
}

main()
    .catch((e) => {
        console.error("❌ Error en la migración:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
