export default function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-50"
    >
      {children}
    </button>
  );
}