interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  body?: string;
  onDark?: boolean;
  align?: 'left' | 'center';
}

export function SectionHead({
  eyebrow,
  title,
  body,
  onDark = false,
  align = 'left',
}: SectionHeadProps) {
  const tone = onDark
    ? {
        eyebrow: 'text-white/50',
        title:   'text-white',
        rule:    'bg-white/30',
        body:    'text-white/70',
      }
    : {
        eyebrow: 'text-ink-400',
        title:   'text-ink-900',
        rule:    'bg-forest',
        body:    'text-ink-500',
      };

  const centered = align === 'center';

  return (
    <div className={centered ? 'text-center' : ''}>
      {eyebrow && (
        <p
          className={`font-sans text-xs font-medium tracking-[0.20em] uppercase ${tone.eyebrow} mb-3`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`font-serif text-3xl md:text-4xl font-bold leading-tight ${tone.title} mb-4`}
      >
        {title}
      </h2>
      <div
        className={`h-px w-10 ${tone.rule} ${centered ? 'mx-auto' : ''} mb-6`}
      />
      {body && (
        <p
          className={`font-sans text-[15px] leading-relaxed max-w-xl ${tone.body} ${
            centered ? 'mx-auto' : ''
          }`}
        >
          {body}
        </p>
      )}
    </div>
  );
}
