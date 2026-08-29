import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded-xs bg-muted px-1 py-px font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function StudyMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text.trim()) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^\s*\|.+\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i] ?? "")) {
        const cells = (lines[i] ?? "")
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!/^\s*\|?\s*:?-{3,}/.test(lines[i] ?? "")) rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        const head = rows[0] ?? [];
        const body = rows.slice(1);
        blocks.push(
          <div key={key++} className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <thead>
                <tr>
                  {head.map((c, ci) => (
                    <th
                      key={ci}
                      className="break-words border-b border-border py-2 pr-2 align-bottom font-medium"
                    >
                      {inline(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="align-top">
                    {row.map((c, ci) => (
                      <td key={ci} className="break-words border-b border-border/70 py-2 pr-2">
                        {inline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const Tag = (level === 1 ? "h3" : level === 2 ? "h4" : "h5") as "h3" | "h4" | "h5";
      blocks.push(
        <Tag
          key={key++}
          className={cn(
            "font-display text-foreground",
            level === 1 ? "text-xl" : level === 2 ? "text-lg" : "text-base",
          )}
        >
          {inline(heading[2] ?? "")}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="space-y-1.5 pl-4 text-sm leading-relaxed">
          {items.map((item, ii) => (
            <li key={ii} className="list-disc">
              {inline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={key++} className="space-y-1.5 pl-5 text-sm leading-relaxed">
          {items.map((item, ii) => (
            <li key={ii} className="list-decimal">
              {inline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^(#{1,3}\s+|[-*]\s+|\d+[.)]\s+|\|)/.test((lines[i] ?? "").trimStart())
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push(
      <p key={key++} className="text-sm leading-relaxed text-foreground/90">
        {inline(para.join(" "))}
      </p>,
    );
  }

  return <div className={cn("min-w-0 space-y-3", className)}>{blocks}</div>;
}
