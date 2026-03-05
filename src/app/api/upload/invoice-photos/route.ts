import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = "public/uploads/invoices";
const MAX_FILES = 5;
const MAX_SIZE_BYTES = 6 * 1024 * 1024; // 6 MB por imagen
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

  const raw = formData.getAll("photos");
  const list = raw.filter((f): f is File => f instanceof File);

  if (list.length === 0) {
    return NextResponse.json(
      { error: "No se enviaron archivos válidos" },
      { status: 400 }
    );
  }

  if (list.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Máximo ${MAX_FILES} fotos` },
      { status: 400 }
    );
  }

  const urls: string[] = [];
  const cwd = process.cwd();
  const dir = path.join(cwd, UPLOAD_DIR);

  await mkdir(dir, { recursive: true });

  for (const file of list) {
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Archivo ${file.name} supera el tamaño máximo (6 MB)` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let image = sharp(buffer);

    const meta = await image.metadata();
    const isImage =
      meta.format != null &&
      ["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff"].includes(
        meta.format
      );
    if (!isImage) {
      return NextResponse.json(
        { error: `${file.name}: formato de imagen no soportado` },
        { status: 400 }
      );
    }

    const basename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`;
    const filePath = path.join(dir, basename);

    const webpBuffer = await image
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    await writeFile(filePath, webpBuffer);

    urls.push(`/uploads/invoices/${basename}`);
  }

  return NextResponse.json({ urls });
}
