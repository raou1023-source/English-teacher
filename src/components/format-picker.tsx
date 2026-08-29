import { FORMATS, type FormatId } from "@/lib/formats";
import { NativeSelect } from "@/components/native-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormatPicker({
  value,
  custom,
  onChange,
  onCustom,
}: {
  value: FormatId;
  custom: string;
  onChange: (id: FormatId) => void;
  onCustom: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <NativeSelect
        id="folio-format"
        label="出力の形式"
        value={value}
        onChange={onChange}
        options={FORMATS.map((f) => ({ id: f.id, label: f.label }))}
      />
      {value === "custom" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-format">出力の形（入力した指示どおり）</Label>
          <Input
            id="custom-format"
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="例: TOEIC Part 5 を3問。解説は日本語。語彙はAnkiDroid用にも"
            autoComplete="off"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {FORMATS.find((f) => f.id === value)?.blurb}
          {value !== "anki" ? " · 書き出しは AnkiDroid（単語・意味・Core・例文5）が基本です。" : ""}
        </p>
      )}
    </div>
  );
}
