import { NextResponse } from "next/server";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const body = await req.json();
  const { transcript, product } = body as { transcript: Msg[]; product: string };

  const rubric = [
    { key: "contact", title: "Установление контакта", what: "тон, эмпатия, рамка разговора" },
    { key: "needs", title: "Выявление потребностей", what: "вопросы, уточнения, фиксация боли" },
    { key: "value", title: "Презентация ценности", what: "связка фич→выгода→потребность" },
    { key: "objections", title: "Работа с возражениями", what: "логика, доказательства, снятие риска" },
    { key: "closing", title: "Закрытие на следующий шаг", what: "конкретный оффер, договорённость" },
  ];

  const system = [
    "Ты — строгий аудитор качества продаж.",
    "Оцени диалог продавца с клиентом по рубрике.",
    "Верни ТОЛЬКО JSON строго по схеме, без текста вокруг.",
    "",
    "Схема ответа:",
    `{ "total": number (0-10), "blocks": [{ "key": string, "title": string, "score": number (0-5), "what_went_well": string[], "to_improve": string[], "examples": string[] }], "summary": string }`,
    "",
    `Продукт, который продавали: ${product}`,
    "Рубрика блоков:",
    ...rubric.map((b) => `- ${b.key}: ${b.title} (${b.what})`),
  ].join("\n");

  const r = await fetch(`${process.env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: "Транскрипт:\n" + JSON.stringify(transcript),
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }, // если у deepseek поддерживается; если нет — уберём
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    return NextResponse.json({ error: "Eval error", details: text }, { status: 500 });
  }

  const data = await r.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";

  // На случай если модель всё равно вернула текст — пытаемся распарсить
  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Non-JSON response", raw }, { status: 500 });
  }
}