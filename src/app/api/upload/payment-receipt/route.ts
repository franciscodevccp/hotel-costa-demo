import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = "public/uploads/payment-receipts";
const MAX_SIZE_BYTES = 6 * 1024 * 1024; // 6 MB
const WEBP_QUALITY = 85;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Formato de solicitud inválido" },
      { status: 400 }
    );
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se envió una imagen válida" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera el tamaño máximo (6 MB)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");

  let image: sharp.Sharp;
  try {
    image = sharp(buffer);
  } catch {
    return NextResponse.json(
      { error: "Archivo no es una imagen válida" },
      { status: 400 }
    );
  }

  const meta = await image.metadata();
  const isImage =
    meta.format != null &&
    ["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff"].includes(meta.format);
  if (!isImage) {
    return NextResponse.json(
      { error: "Formato de imagen no soportado" },
      { status: 400 }
    );
  }

  const cwd = process.cwd();
  const dir = path.join(cwd, UPLOAD_DIR);
  await mkdir(dir, { recursive: true });

  const basename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`;
  const filePath = path.join(dir, basename);
  const webpBuffer = await image.webp({ quality: WEBP_QUALITY }).toBuffer();
  await writeFile(filePath, webpBuffer);

  const url = `/uploads/payment-receipts/${basename}`;
  return NextResponse.json({ url, hash });
}
