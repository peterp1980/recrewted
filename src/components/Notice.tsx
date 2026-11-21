/** Status or error message after a form action. */
export function Notice({ kind, children }: { kind: "ok" | "error" | "info"; children: React.ReactNode }) {
  const styles = { ok: "bg-emerald-50 text-emerald-900", error: "bg-red-50 text-red-900", info: "bg-amber-50 text-amber-900" }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md p-4 ${styles}`}>
      {children}
    </div>
  );
}
