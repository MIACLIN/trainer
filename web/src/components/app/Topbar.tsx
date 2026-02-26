"use client";

import Link from "next/link";

export default function Topbar() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Link href="/trainer" className="font-semibold text-lg tracking-tight">
          Auditorium
        </Link>
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
          <Link className="px-3 py-1 rounded-lg hover:bg-slate-100" href="/trainer">
            Тренажер
          </Link>
          <Link className="px-3 py-1 rounded-lg hover:bg-slate-100" href="/courses">
            Курсы
          </Link>
          <Link className="px-3 py-1 rounded-lg hover:bg-slate-100" href="/analytics">
            Статистика
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="h-9 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">
          Тренировка
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200" />
          <div className="leading-tight">
            <div className="text-sm font-medium">Пётр Петров</div>
            <div className="text-xs text-slate-500">Куратор</div>
          </div>
        </div>
      </div>
    </header>
  );
}