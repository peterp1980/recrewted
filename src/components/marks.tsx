// Hand-drawn marks used instead of an icon set: the strokes a recruiter makes on a CV.
// Slightly irregular paths, round caps, currentColor. Decorative unless a label is given.

type P = { className?: string; label?: string; strokeWidth?: number };
const a11y = (label?: string) => (label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const });

export function Tick({ className = "h-5 w-5", label, strokeWidth = 2.6 }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...a11y(label)}>
      <path d="M3.5 13.2c1.6 1.1 3.3 2.9 4.6 5.1 2.6-6.1 6.6-10.6 12.4-14.6" />
    </svg>
  );
}

export function Cross({ className = "h-5 w-5", label, strokeWidth = 2.4 }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} {...a11y(label)}>
      <path d="M5 5.5c4.6 4 9 8.6 13.6 13.4M18.6 4.8C13.8 9.2 9.6 14 5.3 19" />
    </svg>
  );
}

/** Hand-drawn arrow pointing right. */
export function Arrow({ className = "h-5 w-6", label, strokeWidth = 2.2 }: P) {
  return (
    <svg viewBox="0 0 30 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...a11y(label)}>
      <path d="M2 10.6c7.6-.9 15.2-.8 24.4-.2M19.5 3.2c2.4 2.6 4.6 4.6 7 7.1-2.6 2-4.9 4.1-7.4 6.6" />
    </svg>
  );
}

export function ArrowLeft({ className = "h-5 w-6", label }: P) {
  return <Arrow className={`${className} -scale-x-100`} label={label} />;
}

/** Arrow up-right for "open". */
export function ArrowOut({ className = "h-4 w-4", label, strokeWidth = 2.2 }: P) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...a11y(label)}>
      <path d="M4 16.2C8.2 12 11.6 8.4 15.6 4.4M7.8 4.2c2.6.1 5.2 0 8 .2-.1 2.8 0 5.3.2 7.8" />
    </svg>
  );
}

/** Scribbled circle drawn around something important. Place absolutely over the content. */
export function Circle({ className = "", strokeWidth = 2.4 }: P) {
  return (
    <svg viewBox="0 0 200 80" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M118 7C70 2 15 12 8 38c-6 26 52 38 104 35 50-3 86-16 82-38C190 12 140 4 92 9" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Brush underline. */
export function Underline({ className = "", strokeWidth = 4 }: P) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M3 9.5C46 4.2 96 3.4 197 6.3M28 12c40-3 88-4 140-2.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Asterisk({ className = "h-5 w-5", label, strokeWidth = 2.4 }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} {...a11y(label)}>
      <path d="M12.2 3.2c-.3 6-.1 11.6.1 17.4M4.4 7.6c5.3 2.6 10 5.6 15.4 8.6M19.6 7.2c-5 3.2-10 6.2-15.4 9.2" />
    </svg>
  );
}

/** Paper clip, for "attached" things. */
export function Clip({ className = "h-8 w-4", strokeWidth = 2 }: P) {
  return (
    <svg viewBox="0 0 16 40" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M11 13v17a4 4 0 0 1-8 0V8a5.5 5.5 0 0 1 11 0v21a7 7 0 0 1-14 0" />
    </svg>
  );
}

export function Plus({ className = "h-5 w-5", strokeWidth = 2.4 }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12.3 4c-.2 5.6 0 10.8-.3 16.2M4 12.4c5.6-.4 10.8-.3 16.2-.1" />
    </svg>
  );
}

/** Rating as filled/empty boxes, like a form. */
export function Boxes({ value, max = 5, className = "" }: { value: number; max?: number; className?: string }) {
  return (
    <span className={`inline-flex gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`h-3 w-3 border border-ink ${i < value ? "bg-ink" : "bg-transparent"}`} />
      ))}
    </span>
  );
}
