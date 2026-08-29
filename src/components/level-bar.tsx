import { LEVELS, LEVEL_HINT, levelOptionLabel, type Level } from "@/lib/formats";
import { NativeSelect } from "@/components/native-select";

export function LevelBar({
  value,
  onChange,
  compact = false,
  name = "folio-level",
}: {
  value: Level;
  onChange: (level: Level) => void;
  compact?: boolean;
  name?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <NativeSelect
        id={name}
        label={compact ? undefined : "レベル（CEFR）"}
        ariaLabel="レベル"
        value={value}
        onChange={onChange}
        options={LEVELS.map((level) => ({
          id: level,
          label: levelOptionLabel(level, compact),
        }))}
      />
      {compact ? (
        <p className="truncate text-right text-[11px] leading-tight text-muted-foreground">
          {LEVEL_HINT[value]}
        </p>
      ) : null}
    </div>
  );
}
