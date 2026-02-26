export default function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">
      {children}
    </span>
  );
}