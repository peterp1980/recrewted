/** Head of a public subpage: like the cover sheet of a file – section number, big serif title, ruled area. */
export function PageHero({ eyebrow, title, lead, center = false, children }: { eyebrow: string; title: string; lead?: string; center?: boolean; children?: React.ReactNode }) {
  return (
    <section className="border-b border-ink">
      <div className={`mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-14 pb-14 md:pt-20 md:pb-16 ${center ? "items-center text-center" : ""}`}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="max-w-4xl font-display text-5xl leading-[0.98] font-semibold tracking-tight sm:text-7xl">{title}</h1>
        {lead && <p className="max-w-2xl text-lg leading-relaxed text-ink/80">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
