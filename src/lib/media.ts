export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選んでください");
  }
  if (file.size > 8_000_000) {
    throw new Error("画像が大きすぎます（8MBまで）");
  }
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を処理できませんでした");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const quality = file.size > 1_200_000 ? 0.72 : 0.84;
  return canvas.toDataURL("image/jpeg", quality);
}

export function playDataAudio(audio: string, mime: string) {
  const el = new Audio(`data:${mime};base64,${audio}`);
  void el.play();
  return el;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
