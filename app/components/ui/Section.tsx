import React from 'react';

type Tone = 'paper' | 'paper-warm' | 'paper-stone' | 'forest';

const toneBg: Record<Tone, string> = {
  paper:        'bg-paper',
  'paper-warm': 'bg-paper-warm',
  'paper-stone':'bg-paper-stone',
  forest:       'bg-forest text-white',
};

interface SectionProps {
  tone?: Tone;
  tight?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Section({
  tone = 'paper',
  tight = false,
  children,
  className = '',
  id,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`${toneBg[tone]} ${tight ? 'py-20' : 'py-28'} px-6 lg:px-8 ${className}`}
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}
