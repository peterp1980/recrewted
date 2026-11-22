/** Dark page header of the public subpages, running underneath the floating site header. */
export function PageHero({ eyebrow, title, lead, center = false, children }: { eyebrow: string; title: string; lead?: string; center?: boolean; children?: React.ReactNode }) {
  return (
    <section className="relative -mt-[76px] overflow-hidden bg-night pt-[76px] text-white">
      <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-80" />
      <div aria-hidden="true" className="grid-lines absolute inset-0" />
      <div className={`relative mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-14 pb-16 md:pt-20 md:pb-20 ${center ? "items-center text-center" : ""}`}>
        <p className="text-sm font-semibold tracking-widest text-brand-300 uppercase">{eyebrow}</p>
        <h1 className="max-w-4xl font-display text-4xl font-extrabold tracking-tight sm:text-6xl">{title}</h1>
        {lead && <p className="max-w-2xl text-lg leading-relaxed text-white/70">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
