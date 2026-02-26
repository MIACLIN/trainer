import Link from "next/link";
import Chip from "@/components/ui/Chip";
import { SCENARIOS } from "@/lib/scenarios";


type SkillTag =
  | "Приветствие и установление контакта"
  | "Выявление потребностей"
  | "Про программирование"
  | "Осмотр"
  | "Предварительные согласования"
  | "Закрытие"
  | "Прощание";

const skillTags: SkillTag[] = [
  "Приветствие и установление контакта",
  "Выявление потребностей",
  "Про программирование",
  "Осмотр",
  "Предварительные согласования",
  "Закрытие",
  "Прощание",
];

const recommended = [
  {
    id: "first",
    title: "Сценарий “Первичная консультация”",
    subtitle: "Коротко о продукте и выявление запроса",
    status: "Не начато",
    scenario: "price",
    patientId: "patient-1",
  },
  {
    id: "price",
    title: "Отработка возражения “Это слишком дорого”",
    subtitle: "Работа с ценностью и риском",
    status: "Не начато",
    scenario: "price",
    patientId: "patient-1",
  },
  {
    id: "bad",
    title: "Работа с негативным отзывом",
    subtitle: "Снять эмоцию → вернуть доверие",
    status: "Не начато",
    scenario: "price",
    patientId: "patient-2",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-slate-700">{children}</div>;
}

function Card({
  title,
  desc,
  rightTop,
  tags,
  ctaLabel,
  href,
  secondaryLabel,
}: {
  title: string;
  desc: string;
  rightTop?: React.ReactNode;
  tags?: string[];
  ctaLabel: string;
  href: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium text-slate-900 truncate">{title}</div>
          <div className="text-sm text-slate-600 mt-1">{desc}</div>
        </div>
        {rightTop ? <div className="shrink-0">{rightTop}</div> : null}
      </div>

      {tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        {secondaryLabel ? (
          <button className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm text-slate-800">
            {secondaryLabel}
          </button>
        ) : (
          <span />
        )}

        <Link
          href={href}
          className="h-9 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 grid place-items-center"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function RecommendedCard({
  title,
  status,
  href,
}: {
  title: string;
  status: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white border border-slate-200 p-3 hover:bg-slate-50 transition"
    >
      <div className="h-20 rounded-xl bg-slate-100 border border-slate-200" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-900 line-clamp-2">{title}</div>
        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
          {status}
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="max-w-6xl">
      {/* Breadcrumb + заголовок */}
      <div className="text-xs text-slate-500">Обзор &nbsp;&gt;&nbsp; Тренажёр</div>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Тренажёр</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              className="h-10 w-[340px] rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Название тренировки или навык"
            />
          </div>
          <button className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm">
            Фильтры
          </button>
          <button className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm">
            ⇅
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {skillTags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>

      {/* Recommended */}
      <div className="mt-6">
        <SectionTitle>Рекомендованные</SectionTitle>
        <div className="mt-3 grid md:grid-cols-3 gap-3">
          {recommended.map((x) => (
            <RecommendedCard
              key={x.id}
              title={x.title}
              status={x.status}
              href={`/call/${x.patientId}?scenario=${x.scenario}`}
            />
          ))}
        </div>
      </div>

      {/* Templates (как длинные карточки) */}
      <div className="mt-8 space-y-3">
        <SectionTitle>Шаблоны консультаций</SectionTitle>

        <Card
          title="Полная консультация — Простой уровень"
          desc="Отработка полного сценария консультации клиента: знакомство, выявление потребности, презентация решения."
          rightTop={
            <div className="text-xs text-slate-500 text-right">
              <div>Пройдено: 15.10.2025</div>
              <div>
                Оценка:{" "}
                <span className="inline-flex px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  1/10
                </span>
              </div>
            </div>
          }
          tags={["установление контакта", "выявление потребностей", "аппойнт"]}
          secondaryLabel="Резюме"
          ctaLabel="Повторить"
          href="/call/patient-1?scenario=price"
        />

        <Card
          title="Полная консультация — Средний уровень"
          desc="Добавлены возражения, ограничения клиента и требования к структуре диалога."
          rightTop={
            <div className="text-xs text-slate-500 text-right">
              <div>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Не начато
                </span>
              </div>
            </div>
          }
          tags={["возражения", "структура", "ценность"]}
          ctaLabel="Подробнее"
          href="/call/patient-2?scenario=price"
        />

        <Card
          title="Полная консультация — Сложный уровень"
          desc="Сложный клиент, многослойные потребности, неоднозначные возражения."
          rightTop={
            <div className="text-xs text-slate-500 text-right">
              <div>Пройдено: 15.10.2025</div>
              <div>
                Оценка:{" "}
                <span className="inline-flex px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  9/10
                </span>
              </div>
            </div>
          }
          tags={["сложный клиент", "возражения", "переговоры"]}
          secondaryLabel="Резюме"
          ctaLabel="Подробнее"
          href="/call/patient-1?scenario=price"
        />
      </div>

      {/* Секции ниже (пример как в рефе) */}
      <div className="mt-10 space-y-3">
        <SectionTitle>Установление контакта и построение взаимоотношений</SectionTitle>

        <Card
          title="Сценарий «Первичная консультация»"
          desc="Коммуникация: правильная рамка звонка, контакт и доверие."
          rightTop={
            <div className="text-xs text-slate-500 text-right">
              <div>Пройдено: 15.10.2025</div>
              <div>
                Оценка:{" "}
                <span className="inline-flex px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  1/10
                </span>
              </div>
            </div>
          }
          tags={["контакт", "рамка", "эмпатия"]}
          secondaryLabel="Резюме"
          ctaLabel="Повторить"
          href="/call/patient-1?scenario=price"
        />

        <Card
          title="Отработка возражения «Это слишком дорого»"
          desc="Снятие напряжения, уточнение контекста, возврат к ценности."
          rightTop={
            <div className="text-xs text-slate-500 text-right">
              <div>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Не начато
                </span>
              </div>
            </div>
          }
          tags={["возражения", "ценность", "риски"]}
          ctaLabel="Подробнее"
          href="/call/patient-1?scenario=price"
        />
      </div>

      {/* маленький хвост, чтобы страница "дышала" */}
      <div className="h-10" />
    </div>
  );
}