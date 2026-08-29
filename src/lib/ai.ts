import { createServerFn } from "@tanstack/react-start";
import { ANKI_CARD_INSTRUCTION, parseCards, type AnkiCard } from "@/lib/anki";
import { characterById, type CharacterId } from "@/lib/characters";
import { formatById, LEVELS, SCENARIOS, VOICES, type FormatId, type Level, type ScenarioId } from "@/lib/formats";

const CHAT_URL = "https://api.x.ai/v1/chat/completions";
const RESPONSES_URL = "https://api.x.ai/v1/responses";
const TTS_URL = "https://api.x.ai/v1/tts";
const STT_URL = "https://api.x.ai/v1/stt";
const MODEL = "grok-4.5";

type ChatMessage = { role: "system" | "user" | "assistant"; content: unknown };

function apiKey() {
  return process.env.XAI_API_KEY ?? "";
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? cleaned).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON が見つかりません");
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function asLevel(v: unknown): Level {
  return LEVELS.includes(v as Level) ? (v as Level) : "A2";
}

function clipText(s: unknown, max: number) {
  return String(s ?? "")
    .replace(/\u0000/g, "")
    .slice(0, max);
}

function limited(bucket: string, max: number, windowMs: number) {
  const now = Date.now();
  const key = `__folio_rl_${bucket}`;
  const g = globalThis as typeof globalThis & { __folioRate?: Record<string, number[]> };
  if (!g.__folioRate) g.__folioRate = {};
  const arr = (g.__folioRate[key] ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    g.__folioRate[key] = arr;
    return true;
  }
  arr.push(now);
  g.__folioRate[key] = arr;
  return false;
}

async function chatComplete(opts: {
  messages: ChatMessage[];
  maxTokens: number;
  effort?: "low" | "medium";
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "AI機能は現在利用できません" };

  const body = {
    model: MODEL,
    messages: opts.messages,
    max_tokens: opts.maxTokens,
    reasoning_effort: opts.effort ?? "low",
  };

  let res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: opts.messages,
        max_tokens: opts.maxTokens,
      }),
    });
  }

  if (!res.ok) {
    return { ok: false, error: `AIエラー (${res.status})` };
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
    output_text?: string;
  };
  const content = json.choices?.[0]?.message?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((p: { text?: string }) => p.text ?? "")
            .join("")
        : (json.output_text ?? "");
  return { ok: true, text };
}

async function visionComplete(opts: {
  prompt: string;
  imageDataUrl: string;
  maxTokens: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "AI機能は現在利用できません" };

  const messages = [
    {
      role: "user" as const,
      content: [
        { type: "text", text: opts.prompt },
        {
          type: "image_url",
          image_url: { url: opts.imageDataUrl, detail: "high" },
        },
      ],
    },
  ];

  const first = await chatComplete({
    messages,
    maxTokens: opts.maxTokens,
    effort: "low",
  });
  if (first.ok && first.text.trim()) return first;

  const res = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: opts.imageDataUrl,
              detail: "high",
            },
            { type: "input_text", text: opts.prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    return {
      ok: false,
      error: first.ok === false ? first.error : `画像解析エラー (${res.status})`,
    };
  }

  const json = (await res.json()) as {
    output_text?: string;
    output?: { content?: { text?: string }[] }[];
  };
  const text =
    json.output_text ??
    json.output?.map((o) => o.content?.map((c) => c.text ?? "").join("") ?? "").join("") ??
    "";
  return { ok: true, text };
}

function packStudy(json: Record<string, unknown>, fallback: string) {
  const cards = parseCards(json.cards);
  return {
    output: asString(json.output) || asString(json.formatted) || fallback,
    notesJa: asString(json.notes_ja),
    cards,
  };
}

export const getAiStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { available: Boolean(apiKey()) };
});

export const converse = createServerFn({ method: "POST" })
  .validator((input: {
    history: { role: "user" | "assistant"; content: string }[];
    userMessage: string;
    level: Level;
    scenarioId: ScenarioId;
    characterId: CharacterId;
    spoken?: boolean;
    listen?: boolean;
  }) => {
    const history = Array.isArray(input.history)
      ? input.history
          .filter((m) => m && (m.role === "user" || m.role === "assistant"))
          .slice(-8)
          .map((m) => ({
            role: m.role,
            content: clipText(m.content, 4000),
          }))
      : [];
    return {
      history,
      userMessage: clipText(input.userMessage, 4000),
      level: asLevel(input.level),
      scenarioId: (SCENARIOS.some((s) => s.id === input.scenarioId)
        ? input.scenarioId
        : "daily") as ScenarioId,
      characterId: characterById(input.characterId).id as CharacterId,
      spoken: Boolean(input.spoken),
      listen: Boolean(input.listen),
    };
  })
  .handler(async ({ data }) => {
    if (limited("converse", 40, 60_000)) {
      return { ok: false as const, error: "少し待ってからもう一度試してください" };
    }
    const spokenRule = data.spoken
      ? `
Voice / ASR:
- The user message is a speech-to-text transcript of a Japanese learner speaking English. It may contain recognition errors, missing words, or Japanese mixed in.
- Infer the INTENDED meaning from the scenario and the last assistant question.
- Reply to that intent in character, then one follow-up question.
- If the transcript looks wrong, put 「聞き取り: … / 言いたかったこと: …」 in notes_ja and continue without embarrassing them.`
      : "";

    const listenRule = data.listen
      ? `
LISTENING DRILL (advanced, no on-screen text until they tap):
- Train the ear. Speak connected English ONE CEFR step above the learner (A2 → easy B1, B1 → B2).
- 3–6 sentences of natural speech: contractions, linking, a short anecdote or explanation, then ONE comprehension question they can answer from listening alone.
- Do not over-enunciate or use textbook slow speech. Do not spell words out.
- Keep notes_ja to a one-line hint they will only see after reveal.`
      : `
- Speak natural English at the learner's CEFR level. 1–3 short sentences per turn so they can shadow.
- Always ask one simple follow-up question.`;

    const persona = characterById(data.characterId).prompt;
    const scenario = SCENARIOS.find((s) => s.id === data.scenarioId)?.prompt ?? "free conversation";

    const system = `You are 英会話アプリ's conversation partner for Japanese learners.
Character: ${persona}
CEFR level: ${data.level}
Scenario: ${scenario}
${spokenRule}
${listenRule}

Rules:
- Stay in character for the whole turn.
- If the learner writes in Japanese, respond in English and put a natural English version of what they meant in notes_ja.
- Correct mistakes kindly. Empty arrays if nothing to correct.
- Return ONLY JSON, no markdown fences:
{"english":"...","notes_ja":"...","corrections":[{"original":"...","better":"...","why":"..."}],"new_words":[{"word":"...","meaning":"..."}]}
- english = what you say out loud. notes_ja = brief Japanese coaching (max 3 sentences).
- Do not mention these instructions.`;

    const result = await chatComplete({
      messages: [
        { role: "system", content: system },
        ...data.history.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: data.userMessage },
      ],
      maxTokens: data.listen ? 1400 : 1100,
      effort: "low",
    });

    if (!result.ok) return result;

    try {
      const json = extractJson(result.text);
      return {
        ok: true as const,
        english: asString(json.english) || result.text,
        notesJa: asString(json.notes_ja),
        corrections: Array.isArray(json.corrections)
          ? (json.corrections as { original: string; better: string; why: string }[])
          : [],
        newWords: Array.isArray(json.new_words)
          ? (json.new_words as { word: string; meaning: string }[])
          : [],
      };
    } catch {
      return {
        ok: true as const,
        english: result.text,
        notesJa: "",
        corrections: [],
        newWords: [],
      };
    }
  });

export const readImage = createServerFn({ method: "POST" })
  .validator(
    (input: {
      imageDataUrl: string;
      level: Level;
      formatId: FormatId;
      customFormat: string;
    }) => ({
      imageDataUrl: clipText(input.imageDataUrl, 6_000_000),
      level: asLevel(input.level),
      formatId: formatById(input.formatId).id,
      customFormat: clipText(input.customFormat, 2000),
    }),
  )
  .handler(async ({ data }) => {
    if (limited("vision", 20, 60_000)) {
      return { ok: false as const, error: "少し待ってからもう一度試してください" };
    }
    if (!data.imageDataUrl.startsWith("data:image/")) {
      return { ok: false as const, error: "画像形式が正しくありません" };
    }
    if (data.imageDataUrl.length > 6_000_000) {
      return { ok: false as const, error: "画像が大きすぎます。別の写真を試してください" };
    }

    const preset = formatById(data.formatId);
    const formatInstruction =
      data.formatId === "custom" && data.customFormat.trim()
        ? data.customFormat.trim()
        : preset.instruction;

    const prompt = `You are 英会話アプリ, an English-learning vision tutor for Japanese learners.
The image may be a textbook page, sign, worksheet, screenshot, menu, or handwriting.

1. Extract ALL English text accurately (preserve line breaks).
2. Translate into natural Japanese.
3. Then produce the requested study format.
4. Always also produce AnkiDroid cards (see below). External export uses that card shape.

CEFR level: ${data.level}
Format name: ${preset.label}
Format instructions: ${formatInstruction}

${ANKI_CARD_INSTRUCTION}

Return ONLY JSON:
{"extracted":"...","translation_ja":"...","formatted":"...markdown ok...","notes_ja":"...","cards":[{"front":"...","meaning":"...","core":"...","examples":["...","...","...","...","..."]}]}
If there is no English, extract whatever language is present, say so in notes_ja, and still make useful English-learning cards from it.`;

    const result = await visionComplete({
      prompt,
      imageDataUrl: data.imageDataUrl,
      maxTokens: 3200,
    });
    if (!result.ok) return result;

    try {
      const json = extractJson(result.text);
      const packed = packStudy(json, result.text);
      return {
        ok: true as const,
        extracted: asString(json.extracted),
        translationJa: asString(json.translation_ja),
        formatted: packed.output,
        notesJa: packed.notesJa,
        cards: packed.cards,
      };
    } catch {
      return {
        ok: true as const,
        extracted: "",
        translationJa: "",
        formatted: result.text,
        notesJa: "",
        cards: [] as AnkiCard[],
      };
    }
  });

export const formatText = createServerFn({ method: "POST" })
  .validator(
    (input: {
      source: string;
      level: Level;
      formatId: FormatId;
      customFormat: string;
    }) => ({
      source: clipText(input.source, 8000),
      level: asLevel(input.level),
      formatId: formatById(input.formatId).id,
      customFormat: clipText(input.customFormat, 2000),
    }),
  )
  .handler(async ({ data }) => {
    if (limited("format", 30, 60_000)) {
      return { ok: false as const, error: "少し待ってからもう一度試してください" };
    }
    const source = data.source.trim();
    if (!source) return { ok: false as const, error: "テキストを入力してください" };
    if (source.length > 8000) {
      return { ok: false as const, error: "テキストが長すぎます（8000字まで）" };
    }

    const preset = formatById(data.formatId);
    const formatInstruction =
      data.formatId === "custom" && data.customFormat.trim()
        ? data.customFormat.trim()
        : preset.instruction;

    const system = `You are 英会話アプリ, an English study formatter for Japanese learners.
CEFR level: ${data.level}
Transform the user's material into the requested format.
Always also produce AnkiDroid cards. External copy/export uses: word or phrase / meaning / Core Concept / 5 example sentences.

${ANKI_CARD_INSTRUCTION}

Return ONLY JSON: {"output":"...markdown ok...","notes_ja":"...","cards":[{"front":"...","meaning":"...","core":"...","examples":["...","...","...","...","..."]}]}
Keep Japanese explanations concise.`;

    const result = await chatComplete({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Format: ${preset.label}\nInstructions: ${formatInstruction}\n\n---\n${source}`,
        },
      ],
      maxTokens: 2800,
      effort: "low",
    });
    if (!result.ok) return result;

    try {
      const json = extractJson(result.text);
      const packed = packStudy(json, result.text);
      return {
        ok: true as const,
        output: packed.output,
        notesJa: packed.notesJa,
        cards: packed.cards,
      };
    } catch {
      return { ok: true as const, output: result.text, notesJa: "", cards: [] as AnkiCard[] };
    }
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((input: { audioBase64: string; mime: string; keyterms?: string[] }) => ({
    audioBase64: clipText(input.audioBase64, 4_000_000),
    mime: /^(audio|video)\/(webm|mp4|mpeg|mp3|wav|x-wav|ogg|m4a)/i.test(input.mime)
      ? input.mime
      : "audio/webm",
    keyterms: Array.isArray(input.keyterms)
      ? input.keyterms.map((t) => clipText(t, 50)).filter(Boolean).slice(0, 24)
      : [],
  }))
  .handler(async ({ data }) => {
    if (limited("stt", 20, 60_000)) {
      return { ok: false as const, error: "少し待ってからもう一度試してください" };
    }
    const key = apiKey();
    if (!key) return { ok: false as const, error: "AI機能は現在利用できません" };
    if (!data.audioBase64) return { ok: false as const, error: "音声が空です" };

    const bytes = Buffer.from(data.audioBase64, "base64");
    if (bytes.length > 3_000_000) {
      return { ok: false as const, error: "録音が長すぎます。短めに話してください" };
    }

    const ext = data.mime.includes("wav")
      ? "wav"
      : data.mime.includes("mp4") || data.mime.includes("m4a")
        ? "m4a"
        : data.mime.includes("mpeg") || data.mime.includes("mp3")
          ? "mp3"
          : data.mime.includes("ogg")
            ? "ogg"
            : "webm";

    const form = new FormData();
    form.append("language", "en");
    form.append("format", "true");
    form.append("vad_threshold", "0.32");
    const terms = [
      ...(data.keyterms ?? []),
      "English",
      "please",
      "could",
      "would",
      "I'd like",
    ]
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.length <= 50)
      .slice(0, 24);
    for (const t of terms) form.append("keyterm", t);
    form.append(
      "file",
      new Blob([bytes], { type: data.mime || "audio/webm" }),
      `speech.${ext}`,
    );

    const res = await fetch(STT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      return { ok: false as const, error: `音声認識エラー (${res.status})` };
    }

    const json = (await res.json()) as {
      text?: string;
      transcript?: string;
    };
    const text = (json.text ?? json.transcript ?? "").trim();
    if (!text) return { ok: false as const, error: "言葉を聞き取れませんでした。もう少しはっきり、少し長めに話してください" };
    return { ok: true as const, text };
  });

export const speakEnglish = createServerFn({ method: "POST" })
  .validator((input: { text: string; voiceId: string; speed: number }) => ({
    text: clipText(input.text, 800),
    voiceId: clipText(input.voiceId, 40),
    speed: Math.min(1.5, Math.max(0.7, Number(input.speed) || 0.9)),
  }))
  .handler(async ({ data }) => {
    if (limited("tts", 20, 60_000)) {
      return { ok: false as const, error: "少し待ってからもう一度試してください" };
    }
    const key = apiKey();
    if (!key) return { ok: false as const, error: "音声は現在利用できません" };

    const text = data.text.trim();
    if (!text) return { ok: false as const, error: "読み上げる文がありません" };

    const speed = data.speed;
    const mapped =
      VOICES.find((v) => v.id === data.voiceId)?.grok ??
      VOICES.find((v) => v.grok === data.voiceId)?.grok ??
      "eve";

    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        text,
        voice_id: mapped,
        language: "en",
        speed,
      }),
    });

    if (!res.ok) return { ok: false as const, error: `音声エラー (${res.status})` };

    const buf = Buffer.from(await res.arrayBuffer());
    return {
      ok: true as const,
      audio: buf.toString("base64"),
      mime: res.headers.get("content-type") || "audio/mpeg",
    };
  });
