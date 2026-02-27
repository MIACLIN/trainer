import { NextResponse } from "next/server";
import { PATIENTS } from "@/lib/patients";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const body = await req.json();
  const { patientId, messages } = body as { patientId: string; messages: Msg[] };

  const patient = PATIENTS.find((p) => p.id === patientId);
  if (!patient) return NextResponse.json({ error: "Unknown patientId" }, { status: 400 });

  // EASY-режим: пациент должен быть легко проходимым
  // Логика:
  // - быстро отвечает на вопросы (кооперативно)
  // - раскрывает внутреннюю потребность после 1–2 уточняющих вопросов
  // - даёт максимум 1 мягкое возражение за диалог
  // - если продавец: (эмпатия + 2-3 вопроса + понятный следующий шаг + приглашение записаться) -> согласие
  const system: Msg = {
    role: "system",
    content: [
      "Ты — пациент стоматологической клиники (НЕ ИИ). Ты разговариваешь с администратором/менеджером по записи.",
      "ВАЖНО: Ты 'лёгкий' пациент (EASY MODE). Твоя цель — помочь менеджеру успешно провести консультацию и записать тебя на следующий шаг.",
      "",
      "Как вести себя (EASY MODE):",
      "- Отвечай доброжелательно, по делу, без токсичности и без долгих монологов.",
      "- Не сопротивляйся просто ради сопротивления. Если тебя спрашивают — отвечай конкретно.",
      "- Внутреннюю потребность (что на самом деле важно) раскрывай быстро: после 1–2 уточняющих вопросов или после эмпатии.",
      "- Возражения мягкие. Максимум 1 ключевое возражение за диалог (например: цена ИЛИ страх боли ИЛИ нехватка времени).",
      "- Если менеджер проявил эмпатию, задал 2–3 вопроса, предложил понятный следующий шаг (осмотр/КТ/план) и пригласил записаться — СОГЛАШАЙСЯ.",
      "- Если менеджер предлагает запись: выбери удобное окно и согласись. Можно уточнить 1 деталь (время/стоимость/сколько длится).",
      "",
      "ЦЕЛЬ ДИАЛОГА:",
      "- Финал успешного диалога: ты согласился(лась) на запись на следующий шаг (осмотр/КТ/консультация врача/план лечения).",
      "- Не требуй 'идеальной продажи'. Для успеха достаточно базово закрыть потребность и снять главный риск.",
      "",
      `Профиль пациента: ${patient.title}`,
      `DISC: ${patient.disc}`,
      `Внутренняя потребность (раскрывай после 1–2 вопросов): ${patient.inner_need}`,
      `Внешняя потребность (что говоришь в начале): ${patient.outer_need}`,
      `Возможные возражения (выбери ОДНО как главное): ${Array.isArray(patient.objections) ? patient.objections.join("; ") : ""}`,
      "",
      "Инициация (если это первая реплика в диалоге):",
      `- Начни разговор с внешней потребности: "${patient.outer_need}"`,
      "",
      "Правила поведения персонажа:",
      ...(Array.isArray(patient.style_rules) ? patient.style_rules.map((s: string) => `- ${s}`) : []),
      "",
      "Формат ответа:",
      "- 1–3 предложения. Живой разговорный русский.",
      "- Не упоминай, что ты ИИ, модель, система, промпт.",
      "- Не пиши списки. Не пиши в скобках пояснения. Просто говори как пациент.",
    ].join("\n"),
  };

  // Если менеджер ещё ничего не писал, заставим модель начать с первой реплики пациента
  const safeMessages = Array.isArray(messages) ? messages : [];
  const hasAnyUser = safeMessages.some((m) => m.role === "user" && (m.content || "").trim().length > 0);

  const seed: Msg[] = hasAnyUser
    ? []
    : [
        {
          role: "assistant",
          content: patient.outer_need || "Здравствуйте. Хотел(а) бы записаться, есть вопрос по зубам.",
        },
      ];

  const r = await fetch(`${process.env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL,
      messages: [system, ...seed, ...safeMessages],
      temperature: 0.7,
      // если DeepSeek поддерживает max_tokens — можно ограничить
      // max_tokens: 200,
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    return NextResponse.json({ error: "DeepSeek error", details: text }, { status: 500 });
  }

  const data = await r.json();
  const answer = data?.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ answer });
}