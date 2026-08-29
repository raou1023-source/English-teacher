import { cn } from "@/lib/utils";

export function FolioMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-primary" />
      <rect x="7.5" y="7" width="13.5" height="18" rx="1.6" fill="#f3efe6" />
      <rect
        x="11"
        y="8.5"
        width="13.5"
        height="18"
        rx="1.6"
        fill="#fffcf6"
        stroke="#2c4a42"
        strokeWidth="1"
      />
      <path d="M14 13h8M14 16.5h6.5" stroke="#2c4a42" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
