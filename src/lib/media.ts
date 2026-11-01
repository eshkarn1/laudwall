import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Photos and videos people upload with a testimonial. Stored as random file names next to the database, and only
// accepted when the file's first bytes match a real image or video: the browser's claimed type is never trusted.
export const LIMITS = { photo: 5 * 1024 * 1024, video: 60 * 1024 * 1024 };

const SIGNATURES: { ext: string; kind: "photo" | "video"; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", kind: "photo", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", kind: "photo", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", kind: "photo", test: (b) => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" },
  { ext: "webm", kind: "video", test: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  { ext: "mov", kind: "video", test: (b) => b.toString("latin1", 4, 8) === "ftyp" && b.toString("latin1", 8, 10) === "qt" },
  { ext: "mp4", kind: "video", test: (b) => b.toString("latin1", 4, 8) === "ftyp" },
];

export const TYPES: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
};

export function uploadsDir(): string {
  const db = process.env.LAUDWALL_DB ?? "data/laudwall.db";
  return process.env.LAUDWALL_UPLOADS ?? join(db === ":memory:" ? "data" : dirname(db), "uploads");
}

/** The stored file name, '' for no file, or an error message people can act on. */
export async function saveUpload(file: unknown, kind: "photo" | "video"): Promise<{ name: string } | { error: string }> {
  if (!(file instanceof Blob) || file.size === 0) return { name: "" };
  if (file.size > LIMITS[kind]) return { error: `That ${kind} is over ${LIMITS[kind] / 1024 / 1024} MB` };
  const bytes = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig || sig.kind !== kind) {
    return { error: kind === "photo" ? "Photos must be JPG, PNG or WebP" : "Videos must be MP4, MOV or WebM" };
  }
  const name = `${randomBytes(12).toString("hex")}.${sig.ext}`;
  mkdirSync(uploadsDir(), { recursive: true });
  writeFileSync(join(uploadsDir(), name), bytes);
  return { name };
}

export const SAFE_NAME = /^[a-f0-9]{24}\.(jpg|png|webp|mp4|mov|webm)$/;

export function removeUpload(name: string): void {
  if (!SAFE_NAME.test(name)) return;
  try {
    unlinkSync(join(uploadsDir(), name));
  } catch {
    // already gone
  }
}
