/**
 * Chart-image upload validation. Pure; shared by /setup-grader and /analyze.
 * The declared MIME type is never trusted — the type comes from magic bytes.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export type ImageType = "image/png" | "image/jpeg" | "image/webp";

export function sniffImageType(b: Uint8Array): ImageType | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  return null;
}
const ascii = (b: Uint8Array, s: number, e: number) => String.fromCharCode(...b.subarray(s, e));

export type ImageCheck = { ok: true; type: ImageType; base64: string; bytes: number } | { ok: false; error: string };

export function validateImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: `Image is ${(bytes.length / 1048576).toFixed(1)} MB; the limit is 5 MB.` };
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: "Only PNG, JPEG or WebP images are accepted." };
  return { ok: true, type, base64: Buffer.from(bytes).toString("base64"), bytes: bytes.length };
}

/** Pull the `image` file out of a multipart request and validate it. */
export async function readImageUpload(req: Request): Promise<ImageCheck & { fields?: FormData }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_IMAGE_BYTES + 64 * 1024) return { ok: false, error: "Image is larger than 5 MB." };
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, error: "Send the chart as multipart/form-data with an `image` field." };
  }
  const file = form.get("image");
  if (!(file instanceof Blob)) return { ok: false, error: "Attach a chart image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: `Image is ${(file.size / 1048576).toFixed(1)} MB; the limit is 5 MB.` };
  const check = validateImage(new Uint8Array(await file.arrayBuffer()));
  return check.ok ? { ...check, fields: form } : check;
}
