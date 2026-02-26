"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PATIENTS } from "@/lib/patients";
import { SCENARIOS } from "@/lib/scenarios";

type Msg = { role: "user" | "assistant"; content: string };

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

function containsAny(text: string, needles: string[]) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

export default function CallPage() {
  const params = useParams();
  const search = useSearchParams();

  // ВАЖНО: имя параметра = имя папки. У тебя папка [patientid] или [patientId] — проверь.
  // Если папка [patientid], то используй params.patientid
  const rawId = (params as any)?.patientId ?? (params as any)?.patientid;
  const patientId = Array.isArray(rawId) ? rawId[0] : rawId;

  const scenarioId = search.get("scenario") || "price";
  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId), [scenarioId]);

  const patient = useMemo(() => {
    if (!patientId) return undefined;
    return PATIENTS.find((p) => p.id === patientId);
  }, [patientId]);

  const [product, setProduct] = useState("Наш продукт (впиши кратко)");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const recRef = useRef<any>(null);

  // Чеклист выполненных пунктов
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Авто-отметка задач по репликам продавца
  useEffect(() => {
    if (!scenario) return;

    // собираем весь текст продавца
    const sellerText = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" \n ")
      .toLowerCase();

    const next: Record<string, boolean> = {};
    for (const task of scenario.tasks) {
      next[task.id] = containsAny(sellerText, task.matches);
    }
    setDone(next);
  }, [messages, scenario]);

  useEffect(() => {
    if (!patient) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (e: any) => {
      let interim = "";
      const finals: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals.push(text.trim());
        else interim += text;
      }
      if (interim) setLiveTranscript(interim.trim());
      if (finals.length) {
        setFinalTranscript((prev) => [...prev, ...finals]);
        setLiveTranscript("");
      }
    };

    rec.onerror = (e: any) => {
      console.error("STT error", e);
      setListening(false);
    };

    rec.onend = () => setListening(false);

    recRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [patient]);

  if (!patient) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <div className="text-red-600 font-medium">Пациент не найден</div>
        <div className="mt-2 text-sm text-slate-600">
          Сейчас patientId: <code className="px-1 py-0.5 bg-slate-100 rounded">{String(patientId)}</code>
        </div>
      </main>
    );
  }

  const start = () => {
    const rec = recRef.current;
    if (!rec) {
      alert("SpeechRecognition недоступен. Открой в Chrome/Edge.");
      return;
    }
    setFinalTranscript([]);
    setLiveTranscript("");
    setMessages([]);
    setEvalResult(null);
    setDone({});
    rec.start();
    setListening(true);
  };

  const stop = () => {
    const rec = recRef.current;
    if (!rec) return;
    rec.stop();
    setListening(false);
  };

  const sendTurn = async () => {
    if (busy) return;

    const text = [...finalTranscript, liveTranscript].join(" ").trim();
    if (!text) return;

    setBusy(true);
    setFinalTranscript([]);
    setLiveTranscript("");

    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient.id,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await r.json();
    const answer = data.answer || "(нет ответа)";
    setMessages((prev) => [...prev, { role: "assistant", content: answer }]);

    try {
      const u = new SpeechSynthesisUtterance(answer);
      u.lang = "ru-RU";
      window.speechSynthesis.speak(u);
    } catch {}

    setBusy(false);
  };

  const runEval = async () => {
    if (!messages.length) return;

    setBusy(true);
    setEvalResult(null);

    const r = await fetch("/api/eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: messages, product }),
    });

    const data = await r.json();
    setEvalResult(data);
    setBusy(false);
  };

  const transcriptText = useMemo(() => {
    const parts = [...finalTranscript];
    if (liveTranscript) parts.push(liveTranscript);
    return parts.join(" ").trim();
  }, [finalTranscript, liveTranscript]);

  const elapsedLabel = "00:02"; // MVP: потом сделаем таймер

  return (
    <main className="max-w-6xl">
      {/* верхняя панель действий */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-sm text-slate-500">Тренировка</div>
          <div className="text-lg font-semibold">{scenario?.title ?? "Сценарий"}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            onClick={!listening ? start : stop}
            disabled={busy}
          >
            {!listening ? "Начать звонок" : "Остановить"}
          </button>

          <button
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
            onClick={sendTurn}
            disabled={busy}
          >
            Отправить реплику
          </button>

          <button
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
            onClick={runEval}
            disabled={busy || messages.length < 2}
          >
            Оценить
          </button>
        </div>
      </div>

      {/* 3 карточки как в рефе */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Детали */}
        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Детали тренировки</div>
            <div className="text-xs text-slate-500">{elapsedLabel}</div>
          </div>
          <div className="mt-3 text-sm text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Клиент</span>
              <span className="font-medium">{patient.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">DISC</span>
              <span className="font-medium">{patient.disc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Сценарий</span>
              <span className="font-medium">{scenarioId}</span>
            </div>
          </div>

          <button
            className="mt-4 w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm"
            onClick={stop}
          >
            Завершить звонок
          </button>
        </section>

        {/* Советы */}
        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="font-medium">Советы к прохождению</div>
          <div className="mt-3 text-sm text-slate-700 leading-relaxed">
            {scenario?.tips ??
              "Добавь tips в сценарий. Сейчас здесь будет подсказка как вести диалог."}
          </div>
          <div className="mt-4">
            <label className="text-xs text-slate-500">Продукт (для оценки)</label>
            <input
              className="mt-2 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </div>
        </section>

        {/* Задачи */}
        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="font-medium">Задачи</div>
          <div className="mt-3 space-y-2">
            {(scenario?.tasks ?? []).map((t) => {
              const isDone = !!done[t.id];
              return (
                <div key={t.id} className="flex items-start gap-2">
                  <div
                    className={[
                      "mt-0.5 w-5 h-5 rounded-full border grid place-items-center text-xs",
                      isDone
                        ? "bg-green-50 border-green-300 text-green-700"
                        : "bg-white border-slate-300 text-slate-400",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : ""}
                  </div>
                  <div
                    className={[
                      "text-sm",
                      isDone ? "text-slate-500 line-through" : "text-slate-800",
                    ].join(" ")}
                  >
                    {t.text}
                  </div>
                </div>
              );
            })}
            {!scenario ? (
              <div className="text-sm text-red-600">
                Сценарий не найден. Проверь query параметр scenario.
              </div>
            ) : null}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Авто-галочки ставятся по словам-триггерам в репликах продавца (matches).
          </div>
        </section>
      </div>

      {/* Транскрипт + диалог */}
      <section className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Транскрипт разговора</div>
          <div className="text-xs text-slate-500">
            {listening ? "идёт запись..." : "пауза"}
          </div>
        </div>

        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          {/* live транскрипция */}
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 min-h-[160px]">
            <div className="text-xs text-slate-500 mb-2">Вы (live)</div>
            <div className="text-sm whitespace-pre-wrap">
              {transcriptText || <span className="text-slate-400">Говори — появится текст…</span>}
            </div>
            <div className="text-xs text-slate-400 mt-3">
              Лучше работает в Chrome/Edge (Web Speech API).
            </div>
          </div>

          {/* история диалога */}
          <div className="rounded-2xl border border-slate-200 p-4 min-h-[160px] max-h-[360px] overflow-auto">
            <div className="text-xs text-slate-500 mb-2">История</div>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <div className="text-xs text-slate-500 mb-1">
                    {m.role === "user" ? "Вы" : "Клиент"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {!messages.length ? <div className="text-sm text-slate-400">Пока пусто.</div> : null}
            </div>
          </div>
        </div>
      </section>

      {/* Результаты оценки */}
      <section className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
        <div className="font-medium">Результат оценки</div>

        {!evalResult ? (
          <div className="text-sm text-slate-500 mt-2">Нажми “Оценить” после пары реплик.</div>
        ) : evalResult.error ? (
          <pre className="text-sm mt-2 whitespace-pre-wrap">{JSON.stringify(evalResult, null, 2)}</pre>
        ) : (
          <div className="mt-3 grid gap-3">
            <div className="text-sm">
              Итог: <span className="font-semibold">{evalResult.total}</span>/10
            </div>
            <div className="text-sm text-slate-700">{evalResult.summary}</div>

            <div className="grid gap-3">
              {evalResult.blocks?.map((b: any) => (
                <div key={b.key} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{b.title}</div>
                    <div className="text-sm">Оценка: {b.score}/5</div>
                  </div>

                  <div className="mt-2 text-sm">
                    <div className="text-slate-500">Что улучшить:</div>
                    <ul className="list-disc pl-5">
                      {(b.to_improve || []).map((x: string, i: number) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}