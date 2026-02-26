"use client";

import Link from "next/link";

const items = [
  { href: "/trainer", label: "Тренажер" },
  { href: "/courses", label: "Курсы" },
  { href: "/analytics", label: "Статистика" },
];

export default function Sidebar() {
  return (
    <aside className="w-[84px] bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4">
      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white grid place-items-center font-semibold">
        A
      </div>

      <nav className="flex flex-col gap-2 w-full px-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="h-11 rounded-xl hover:bg-slate-100 grid place-items-center text-xs text-slate-600"
            title={it.label}
          >
            {it.label.slice(0, 2).toUpperCase()}
          </Link>
        ))}
      </nav>

      <div className="mt-auto w-10 h-10 rounded-full bg-slate-200" title="Профиль" />
    </aside>
  );
}