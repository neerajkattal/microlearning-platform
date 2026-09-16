import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-amber-600 to-rose-500 text-white hover:from-amber-500 hover:to-rose-400 shadow-glow disabled:opacity-40 disabled:shadow-none",
  secondary:
    "bg-stone-800 text-stone-100 border border-stone-700 hover:bg-stone-700 disabled:opacity-40",
  ghost: "text-stone-300 hover:text-white hover:bg-stone-800/60 disabled:opacity-40",
  danger: "bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-40",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold
        text-sm transition-all duration-150 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
