import Link from "next/link";
import Chip from "@/components/ui/Chip";

const recommended = [
  { id: "price", title: "Отработка возражения “Это слишком дорого”", status: "Не начато" },
  { id: "bad-review", title: "Работа с негативным отзывом", status: "Не начато" },
  { id: "first", title: "Сценарий “Первичная консультация”", status: "Не начато" },
];

const templates = [
  {
    id: "simple",
    title: "Полная консультация — Простой уровень",
    desc: "Тренировка знакомства и первичного выявления потребностей.",
    tags: ["установление контакта", "выявление потребностей"],
    score: "1/10",
  },
  {
    id: "mid",
    title: "Полная консультация — Средний уровень",
    desc: "Добавлены возражения и требования к структуре диалога.",
    tags: ["возражения", "структура", "польза"],
    score: "не начато",
  },
];

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{title}</div>
          {subtitle ? <div className="text-sm text-slate-600 mt-1">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export default function TrainerPage() {
  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Тренажер</h1>
          <div className="text-sm text-slate-600 mt-1">
            Выбирай сценарий и переходи в тренировку.
          </div>
        </div>

        <div className="flex gap-2">
          <input
            className="h-10 w-72 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            placeholder="Название тренировки или навык"
          />
          <button className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm">
            Фильтры
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium text-slate-700 mb-3">Рекомендованные</div>
        <div className="grid md:grid-cols-3 gap-3">
          {recommended.map((x) => (
            <Link
              key={x.id}
              href={`/call/patient-1?scenario=${x.id}`}
              className="rounded-2xl bg-white border border-slate-200 p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{x.title}</div>
                <span className="text-xs text-slate-500">{x.status}</span>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Chip>Контакт</Chip>
                <Chip>Возражения</Chip>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        <div className="text-sm font-medium text-slate-700">Шаблоны консультаций</div>
        {templates.map((t) => (
          <Card
            key={t.id}
            title={t.title}
            subtitle={t.desc}
            right={<div className="text-xs text-slate-500">Оценка: {t.score}</div>}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2 flex-wrap">
                {t.tags.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </div>
              <Link
                href={`/call/patient-1?scenario=${t.id}`}
                className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800 grid place-items-center"
              >
                Подробнее
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}