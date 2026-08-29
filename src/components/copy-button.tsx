import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyButton({ text, label = "コピー" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!text.trim()) return;
        await navigator.clipboard.writeText(text);
        setDone(true);
        toast.success("コピーしました");
        window.setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? <Check /> : <Copy />}
      {label}
    </Button>
  );
}
