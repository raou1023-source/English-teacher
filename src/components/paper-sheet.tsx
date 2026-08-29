import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PaperSheet({
  children,
  className,
  ruled = false,
  margin = false,
}: {
  children: ReactNode;
  className?: string;
  ruled?: boolean;
  margin?: boolean;
}) {
  return (
    <div
      className={cn(
        "paper-sheet",
        ruled && "paper-ruled",
        margin && "paper-margin",
        className,
      )}
    >
      {children}
    </div>
  );
}
