import type { AnkiCard } from "@/lib/anki";

export function AnkiCards({ cards }: { cards: AnkiCard[] }) {
  if (!cards.length) return null;
  return (
    <ol className="flex min-w-0 flex-col gap-3">
      {cards.map((card, i) => (
        <li
          key={`${card.front}-${i}`}
          className="bg-paper px-4 py-3 paper-shadow"
        >
          <p className="font-display text-lg leading-snug text-foreground">{card.front}</p>
          {card.meaning ? (
            <p className="mt-1 text-sm text-foreground">
              <span className="text-xs font-medium tracking-wide text-muted-foreground">意味 </span>
              {card.meaning}
            </p>
          ) : null}
          {card.core ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              <span className="text-xs font-medium tracking-wide">Core Concept </span>
              {card.core}
            </p>
          ) : null}
          {card.examples.filter(Boolean).length ? (
            <ol className="mt-2 space-y-1 border-t border-border pt-2 text-sm leading-relaxed">
              {card.examples.filter(Boolean).map((ex, n) => (
                <li key={n} className="flex gap-2">
                  <span className="w-4 shrink-0 text-xs text-muted-foreground">{n + 1}</span>
                  <span>{renderBold(ex)}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
