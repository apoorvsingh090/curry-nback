import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

const baseClasses =
  "inline-flex w-full items-center justify-center gap-3 rounded-2xl border-2 px-6 text-center font-bold leading-tight transition-transform active:translate-y-1 disabled:opacity-60";

const variantClasses: Record<Variant, string> = {
  primary:
    "min-h-[80px] border-brand bg-brand text-white shadow-button hover:bg-brand-deep active:shadow-none",
  secondary:
    "min-h-[72px] border-brand bg-surface text-brand shadow-button-sm hover:bg-brand-soft active:shadow-none",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function BigButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        baseClasses,
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  children: ReactNode;
}

export function BigLinkButton({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={[
        baseClasses,
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Link>
  );
}
