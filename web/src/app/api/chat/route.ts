import { NextResponse } from "next/server";
import { PATIENTS } from "@/lib/patients";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const body = await req.json();
  const { patientId, messages } = body as { patientId: string; messages: Msg[] };

  const patient = PATIENTS.find((p) => p.id === patientId);
  if (!patient) return NextResponse.json({ error: "Unknown patientId" }, { status: 400 });

  const system: Msg = {
    role: "system",
    content: [
      "Ты — ИИ-покупатель в стоматологической клинике.",
      "Твоя задача: вести себя как реальный клиент и НЕ помогать продавцу.",
      "Покупка считается успешной только если продавец убедительно закрыл потребность и снял риски.",
      "",
      `Профиль клиента: ${patient.title}`,
      `DISC: ${patient.disc}`,
      `Внутренняя потребность: ${patient.inner_need}`,
      `Внешняя потребность: ${patient.outer_need}`,
      `Типовые возражения: ${patient.objections.join("; ")}`,
      "Правила поведения:",
      ...patient.style_rules.map((s) => `- ${s}`),
      "",
      "Формат: отвечай как человек, 1–4 предложения. Не пиши, что ты ИИ.",
    ].join("\n"),
  };

  const r = await fetch(`${process.env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL,
      messages: [system, ...(messages || [])],
      temperature: 0.8,
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