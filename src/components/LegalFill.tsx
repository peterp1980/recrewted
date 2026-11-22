/** Placeholder in legal texts: visibly marked until projx fills in the real value. */
export function Fill({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-amber-200 px-1 text-amber-950">[{children}]</mark>;
}
