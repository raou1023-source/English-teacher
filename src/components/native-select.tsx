import { cn } from "@/lib/utils";

export function NativeSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className,
  size = "md",
  ariaLabel,
}: {
  id: string;
  label?: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  className?: string;
  size?: "md" | "lg";
  ariaLabel?: string;
}) {
  return (
    <label htmlFor={id} className={cn("flex min-w-0 flex-col gap-1", className)}>
      {label ? (
        <span className="text-xs font-medium tracking-wide text-muted-foreground">{label}</span>
      ) : null}
      <select
        id={id}
        aria-label={label ?? ariaLabel ?? id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn("field cursor-pointer touch-manipulation px-3 text-base", size === "lg" ? "h-12" : "h-11")}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
