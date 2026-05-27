import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  className,
  label,
  error,
  id,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm text-dim mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded border border-line bg-panel2 px-3 py-2 text-sm text-ink placeholder-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50",
          error && "border-warn",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-warn">{error}</p>}
    </div>
  );
}
