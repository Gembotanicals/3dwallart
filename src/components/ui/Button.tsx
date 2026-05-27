import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50",
        variant === "primary" && "bg-accent text-white hover:bg-accent/90",
        variant === "secondary" &&
          "bg-panel border border-line text-ink hover:bg-panel2",
        variant === "ghost" && "text-dim hover:text-ink hover:bg-panel",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
