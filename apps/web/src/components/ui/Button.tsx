import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// Neubrutalism's physical-button trick: a hard offset shadow at rest
// that grows on hover (lifting the button up and away from its
// shadow) and disappears entirely on press (the button "meets" its
// shadow, reading as pushed flat) - shadow-card/shadow-glow are the
// two hard-shadow sizes defined in tailwind.config.js.
const PRESSABLE = "border-2 border-ink shadow-card hover:shadow-glow hover:-translate-y-0.5 active:shadow-none active:translate-y-0";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: `bg-accent-yellow text-ink ${PRESSABLE} disabled:opacity-40 disabled:shadow-none disabled:translate-y-0`,
  secondary: `bg-white text-ink ${PRESSABLE} disabled:opacity-40 disabled:shadow-none disabled:translate-y-0`,
  ghost: "text-ink hover:bg-stone-100 disabled:opacity-40",
  danger: `bg-accent-coral text-ink ${PRESSABLE} disabled:opacity-40 disabled:shadow-none disabled:translate-y-0`,
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
