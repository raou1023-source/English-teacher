export function imageFilesFromClipboard(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const out: File[] = [];
  for (const file of Array.from(data.files ?? [])) {
    if (file.type.startsWith("image/")) out.push(file);
  }
  if (out.length) return out;
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) out.push(file);
    }
  }
  return out;
}
