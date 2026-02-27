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

function normalizePatientId(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;

  // FIX: поддержка /call/patient-1 -> p1
  const m = s.match(/^patient-(\d+)$/i);
  if (m) return `p${m[1]}`;

  return s;
}

export default function CallPage() {
  const params = useParams();
  const search = useSearchParams();

  // Берём первое значение из params + нормализуем patient-1 -> p1.
  const patientId = useMemo(() => {
    const p = params as any;
    const keys = Object.keys(p || {});
    if (!keys.length) return undefined;
    const raw = p[keys[0]];
    const val = Array.isArray(raw) ? raw[0] : raw;
    return normalizePatientId(val);
  }, [params]);

  const scenarioId = search.get("scenario") || "price";

  // FIX: если сценарий не найден — берём первый, а не показываем красную ошибку
  const scenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  }, [scenarioId]);

  const patient = useMemo(() => {
    const normalized = patientId ? String(patientId) : "";
    const found = normalized
      ? PATIENTS.find((p: any) => String(p.id) === normalized)
      : undefined;
    return found ?? PATIENTS[0];
  }, [patientId]);

  const PRODUCT_CONTEXT =
    "Стоматологическая клиника. Цель консультации: выявить проблему пациента и записать на следующий шаг (осмотр/КТ/план лечения).";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState<string[]>([]);
  const [listening, setListening] = useState(false);

  const [busy, setBusy] = useState(false);
  const [evalBusy, setEvalBusy] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const recRef = useRef<any>(null);

  const [done, setDone] = useState<Record<string, boolean>>({});

  const endpointTimerRef = useRef<number | null>(null);
  const sendLockRef = useRef(false);
  const shouldListenRef = useRef(false);

  const liveRef = useRef<string>("");
  const finalsRef = useRef<string[]>([]);

  const patientSpeakingRef = useRef(false);

  const ENDPOINT_MS = 800;

  const evalTimerRef = useRef<number | null>(null);
  const EVAL_DEBOUNCE_MS = 1200;

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      if (!voices.length) return;

      const ru = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("ru"));
      const preferred =
        ru.find((v) => /google/i.test(v.name)) ||
        ru.find((v) => /microsoft/i.test(v.name)) ||
        ru[0] ||
        voices[0] ||
        null;

      voiceRef.current = preferred;
    };

    pickVoice();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!scenario) return;

    const sellerText = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" \n ")
      .toLowerCase();

    const next: Record<string, boolean> = {};
    for (const task of scenario.tasks ?? []) {
      next[task.id] = containsAny(sellerText, task.matches);
    }
    setDone(next);
  }, [messages, scenario]);

  const runEval = async (msgs?: Msg[]) => {
    const transcript = msgs ?? messages;
    if (transcript.length < 2) return;
    if (evalBusy) return;

    setEvalBusy(true);
    setEvalResult(null);

    const r = await fetch("/api/eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        product: PRODUCT_CONTEXT,
      }),
    });

    const data = await r.json();
    setEvalResult(data);
    setEvalBusy(false);
  };

  const scheduleEval = (nextMessages: Msg[]) => {
    if (evalTimerRef.current) window.clearTimeout(evalTimerRef.current);
    evalTimerRef.current = window.setTimeout(() => {
      runEval(nextMessages).catch(() => {});
    }, EVAL_DEBOUNCE_MS);
  };

  const stopSTT = () => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  };

  const startSTT = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (!shouldListenRef.current) return;
    if (patientSpeakingRef.current) return;

    try {
      rec.start();
      setListening(true);
    } catch {}
  };

  const speakPatient = (text: string) => {
    try {
      patientSpeakingRef.current = true;

      finalsRef.current = [];
      liveRef.current = "";
      setFinalTranscript([]);
      setLiveTranscript("");

      if (endpointTimerRef.current) window.clearTimeout(endpointTimerRef.current);

      stopSTT();

      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ru-RU";
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 0.98;
      u.pitch = 1.0;
      u.volume = 1.0;

      const resume = () => {
        patientSpeakingRef.current = false;
        startSTT();
      };

      u.onend = resume;
      u.onerror = resume;

      window.speechSynthesis.speak(u);
    } catch {
      patientSpeakingRef.current = false;
      startSTT();
    }
  };

  const sendTurnText = async (text: string) => {
    if (busy) return;
    if (patientSpeakingRef.current) return;

    const cleaned = (text || "").trim();
    if (!cleaned) return;

    const pid = (patient as any)?.id;
    if (!pid) return;

    setBusy(true);

    finalsRef.current = [];
    liveRef.current = "";
    setFinalTranscript([]);
    setLiveTranscript("");

    const nextMessages: Msg[] = [...messages, { role: "user", content: cleaned }];
    setMessages(nextMessages);

    scheduleEval(nextMessages);

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: pid,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await r.json();
    const answer = data.answer || "(нет ответа)";

    const withAnswer: Msg[] = [...nextMessages, { role: "assistant", content: answer }];
    setMessages(withAnswer);

    scheduleEval(withAnswer);
    speakPatient(answer);

    setBusy(false);
  };

  useEffect(() => {
    if (!patient) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (e: any) => {
      if (patientSpeakingRef.current) return;

      let interim = "";
      const finals: string[] = [];

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals.push(text.trim());
        else interim += text;
      }

      if (interim.trim()) {
        liveRef.current = interim.trim();
        setLiveTranscript(liveRef.current);
      }

      if (finals.length) {
        finalsRef.current = [...finalsRef.current, ...finals];
        setFinalTranscript((prev) => [...prev, ...finals]);
        liveRef.current = "";
        setLiveTranscript("");
      }

      if (endpointTimerRef.current) window.clearTimeout(endpointTimerRef.current);
      endpointTimerRef.current = window.setTimeout(() => {
        if (!shouldListenRef.current) return;
        if (patientSpeakingRef.current) return;
        if (sendLockRef.current) return;

        const textToSend = [...finalsRef.current, liveRef.current].join(" ").trim();
        if (!textToSend) return;

        sendLockRef.current = true;
        sendTurnText(textToSend)
          .catch(() => {})
          .finally(() => {
            sendLockRef.current = false;
          });
      }, ENDPOINT_MS);
    };

    rec.onerror = (e: any) => {
      console.error("STT error", e);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      if (!shouldListenRef.current) return;
      if (patientSpeakingRef.current) return;
      try {
        rec.start();
        setListening(true);
      } catch {}
    };

    recRef.current = rec;

    return () => {
      try {
        shouldListenRef.current = false;
        rec.stop();
      } catch {}
    };
  }, [patient]); // eslint-disable-line react-hooks/exhaustive-deps

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

    finalsRef.current = [];
    liveRef.current = "";

    try {
      window.speechSynthesis.cancel();
    } catch {}

    patientSpeakingRef.current = false;

    shouldListenRef.current = true;
    startSTT();
  };

  const stop = () => {
    shouldListenRef.current = false;
    stopSTT();

    try {
      window.speechSynthesis.cancel();
    } catch {}

    patientSpeakingRef.current = false;

    if (endpointTimerRef.current) window.clearTimeout(endpointTimerRef.current);
    if (evalTimerRef.current) window.clearTimeout(evalTimerRef.current);
  };

  const transcriptText = useMemo(() => {
    const parts = [...finalTranscript];
    if (liveTranscript) parts.push(liveTranscript);
    return parts.join(" ").trim();
  }, [finalTranscript, liveTranscript]);

  const elapsedLabel = "00:02";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* top bar */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-sm text-slate-500">Тренировка</div>
            <div className="text-2xl font-semibold text-slate-900">
              {scenario?.title ?? "Сценарий"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              {busy
                ? "клиент отвечает…"
                : patientSpeakingRef.current
                ? "клиент говорит…"
                : listening
                ? "слушаю…"
                : "пауза"}
              {evalBusy ? " • считаю оценку…" : ""}
            </div>

            <button
              className="h-10 px-5 rounded-2xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm"
              onClick={!listening ? start : stop}
              disabled={busy || evalBusy}
            >
              {!listening ? "Начать звонок" : "Остановить"}
            </button>
          </div>
        </div>

        {/* cards */}
        <div className="grid lg:grid-cols-3 gap-4">
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">Детали тренировки</div>
              <div className="text-xs text-slate-500">{elapsedLabel}</div>
            </div>
            <div className="mt-4 text-sm text-slate-700 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Клиент</span>
                <span className="font-medium text-right">{(patient as any)?.title}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">DISC</span>
                <span className="font-medium">{(patient as any)?.disc}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Сценарий</span>
                <span className="font-medium">{scenario?.id ?? scenarioId}</span>
              </div>
            </div>

            <button
              className="mt-5 w-full h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-sm"
              onClick={stop}
            >
              Завершить звонок
            </button>
          </section>

          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="font-medium text-slate-900">Советы к прохождению</div>
            <div className="mt-3 text-sm text-slate-700 leading-relaxed">
              {scenario?.tips ??
                "Добавь tips в сценарий. Сейчас здесь будет подсказка как вести диалог."}
            </div>

            <div className="mt-5 text-xs text-slate-500">
              Контекст оценки: стоматологическая клиника (поле “продукт” убрано).
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="font-medium text-slate-900">Задачи</div>

            <div className="mt-4 space-y-2">
              {(scenario?.tasks ?? []).map((t) => {
                const isDone = !!done[t.id];
                return (
                  <div key={t.id} className="flex items-start gap-2">
                    <div
                      className={[
                        "mt-0.5 w-5 h-5 rounded-full border grid place-items-center text-xs",
                        isDone
                          ? "bg-blue-50 border-blue-300 text-blue-700"
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
            </div>

            <div className="mt-5 text-xs text-slate-500">
              Авто-галочки ставятся по словам-триггерам в репликах продавца (matches).
            </div>
          </section>
        </div>

        {/* transcript + history */}
        <section className="mt-4 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-medium text-slate-900">Транскрипт разговора</div>
            <div className="text-xs text-slate-500">{listening ? "идёт запись..." : "пауза"}</div>
          </div>

          <div className="mt-4 grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 min-h-[160px]">
              <div className="text-xs text-slate-500 mb-2">Вы (live)</div>
              <div className="text-sm whitespace-pre-wrap text-slate-900">
                {transcriptText || <span className="text-slate-400">Говори — появится текст…</span>}
              </div>
              <div className="text-xs text-slate-400 mt-3">
                Лучше работает в Chrome/Edge (Web Speech API).
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 min-h-[160px] max-h-[360px] overflow-auto">
              <div className="text-xs text-slate-500 mb-2">История</div>
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className="text-sm">
                    <div className="text-xs text-slate-500 mb-1">
                      {m.role === "user" ? "Вы" : "Клиент"}
                    </div>
                    <div className="whitespace-pre-wrap text-slate-900">{m.content}</div>
                  </div>
                ))}
                {!messages.length ? (
                  <div className="text-sm text-slate-400">Пока пусто.</div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* eval */}
        <section className="mt-4 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="font-medium text-slate-900">Результат оценки (live)</div>

          {!evalResult ? (
            <div className="text-sm text-slate-500 mt-2">
              {messages.length < 2 ? "Сделай пару реплик — оценка появится автоматически." : "Считаю…"}
            </div>
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
                  <div key={b.key} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-900">{b.title}</div>
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
      </div>
    </main>
  );
}