import React from 'react';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'md' | 'sm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  as?: 'button' | 'a';
  href?: string;
}

const base =
  'inline-flex items-center gap-2 font-sans transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

const sizes: Record<Size, string> = {
  md: 'px-8 py-3.5 text-sm tracking-[0.05em]',
  sm: 'px-5 py-2.5 text-xs tracking-[0.08em] uppercase font-semibold',
};

const variants: Record<Variant, string> = {
  primary: 'bg-forest text-white hover:bg-forest-deep',
  outline: 'border border-forest text-forest hover:bg-forest hover:text-white',
  ghost:   'text-ink-500 hover:text-ink-900',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  as: Tag = 'button',
  href,
  ...props
}: ButtonProps) {
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (Tag === 'a' || href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button {...props} className={classes}>
      {children}
    </button>
  );
}
