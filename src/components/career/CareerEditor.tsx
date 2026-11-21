"use client";

/* eslint-disable @next/next/no-img-element -- thumbnails of uploaded images */
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, ImageIcon, Monitor, Plus, Smartphone, Trash2, X } from "lucide-react";
import { getMessages } from "@/i18n";
import { newSection, SECTION_TYPES, type CareerDocument, type Section, type SectionType } from "@/lib/careers/document";
import { discardCareerDraft, publishCareerPage, saveCareerDraft, submitCareerPage, uploadCareerMedia } from "@/app/career-actions";
import type { JobCard } from "./CareerSections";

// Field layout per section type. "list" fields hold repeatable items with their own fields.
type Field = { key: string; kind: "text" | "textarea" | "image" };
type ListField = { key: string; kind: "list"; fields: Field[]; max: number };
const F = (key: string, kind: Field["kind"] = "text"): Field => ({ key, kind });
const L = (key: string, fields: Field[], max = 12): ListField => ({ key, kind: "list", fields, max });

const FIELDS: Record<SectionType, (Field | ListField)[]> = {
  hero: [F("headline"), F("text", "textarea"), F("imageUrl", "image")],
  facts: [L("items", [F("value"), F("label")], 4)],
  jobs: [F("title"), F("text", "textarea")],
  benefits: [F("title"), L("items", [F("title"), F("text", "textarea")])],
  text: [F("title"), F("body", "textarea"), F("imageUrl", "image")],
  testimonials: [F("title"), L("items", [F("name"), F("role"), F("photo", "image"), F("quote", "textarea")], 6)],
  gallery: [F("title"), L("images", [F("url", "image"), F("alt")])],
  video: [F("title"), F("youtubeId"), F("text", "textarea")],
  faq: [F("title"), L("items", [F("q"), F("a", "textarea")])],
  process: [F("title"), L("steps", [F("title"), F("text", "textarea")], 6)],
  locations: [F("title"), L("items", [F("name"), F("address", "textarea")])],
  contact: [F("title"), F("office", "textarea"), F("contact", "textarea")],
};

type Props = {
  orgId: string;
  name: string;
  website: string | null;
  color: string | null;
  tone: "sie" | "du";
  initialDoc: CareerDocument;
  initialStatus: string;
  canPublish: boolean;
  hasPublished: boolean;
  liveUrl: string | null;
  media: string[];
  jobs: JobCard[];
};

type Data = Record<string, unknown>;
const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
const newId = (type: string) => `${type}-${Math.random().toString(36).slice(2, 8)}`;
const timeFmt = new Intl.DateTimeFormat("de-DE", { timeStyle: "short", timeZone: "Europe/Berlin" });

export function CareerEditor(p: Props) {
  const t = getMessages().editor;
  const [doc, setDoc] = useState<CareerDocument>(p.initialDoc);
  const [status, setStatus] = useState(p.initialStatus);
  const [open, setOpen] = useState<string | null>(p.initialDoc.sections[0]?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [media, setMedia] = useState(p.media);
  const [picker, setPicker] = useState<((url: string) => void) | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [pending, start] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const drag = useRef<number | null>(null);

  // Live preview: send the current draft to the embedded preview page.
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: "recrewted:career-preview", doc, name: p.name, website: p.website, color: p.color, tone: p.tone, jobs: p.jobs },
      window.location.origin,
    );
  }, [doc, p.name, p.website, p.color, p.tone, p.jobs]);
  useEffect(() => {
    send();
  }, [send]);
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "recrewted:career-preview-ready") send();
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [send]);

  // Autosave 1.5 s after the last change.
  const save = useCallback(
    async (d: CareerDocument) => {
      const r = await saveCareerDraft(p.orgId, d);
      if (r.ok) {
        setDirty(false);
        setStatus("draft");
        setNote({ ok: true, text: t.saved(timeFmt.format(new Date(r.at))) });
      } else setNote({ ok: false, text: t.saveError });
      return r.ok;
    },
    [p.orgId, t],
  );
  useEffect(() => {
    if (!dirty) return;
    const h = setTimeout(() => void save(doc), 1500);
    return () => clearTimeout(h);
  }, [doc, dirty, save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (next: CareerDocument) => {
    setDoc(next);
    setDirty(true);
    setNote({ ok: true, text: t.unsaved });
  };
  const setSections = (sections: Section[]) => change({ ...doc, sections });
  const patch = (id: string, data: Data) => setSections(doc.sections.map((s) => (s.id === id ? ({ ...s, data: { ...(s.data as Data), ...data } } as Section) : s)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= doc.sections.length || from === to) return;
    const next = [...doc.sections];
    const [s] = next.splice(from, 1);
    next.splice(to, 0, s);
    setSections(next);
  };
  const add = (type: SectionType) => {
    const s = newSection(type, newId(type));
    setSections([...doc.sections, s]);
    setOpen(s.id);
  };

  const act = (fn: () => Promise<{ ok: boolean }>, okText: string, nextStatus: string) =>
    start(async () => {
      if (dirty && !(await save(doc))) return;
      const r = await fn();
      if (r.ok) {
        setStatus(nextStatus);
        setNote({ ok: true, text: okText });
      } else setNote({ ok: false, text: t.saveError });
    });

  const onUpload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const r = await uploadCareerMedia(p.orgId, fd);
    if (r.ok) setMedia((m) => [r.url, ...m]);
    return r;
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="card sticky top-2 z-20 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status === "published" ? "bg-emerald-50 text-emerald-800" : status === "in_review" ? "bg-amber-50 text-amber-800" : "bg-neutral-100 text-ink/70"}`}>
              {t.status[status]}
            </span>
            {note && <span role="status" className={`text-xs ${note.ok ? "text-muted" : "text-red-700"}`}>{pending ? t.saving : note.text}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {p.canPublish ? (
              <button type="button" disabled={pending} onClick={() => act(() => publishCareerPage(p.orgId), t.published, "published")} className="btn-primary py-2">{t.publish}</button>
            ) : (
              <button type="button" disabled={pending || status === "in_review"} onClick={() => act(() => submitCareerPage(p.orgId), t.submitted, "in_review")} className="btn-primary py-2">{t.submit}</button>
            )}
            {p.hasPublished && status !== "published" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(t.discardConfirm)) start(async () => { if ((await discardCareerDraft(p.orgId)).ok) window.location.reload(); });
                }}
                className="btn-secondary py-2"
              >
                {t.discard}
              </button>
            )}
            {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener" className="btn-secondary py-2">{t.openLive}</a>}
          </div>
          {!p.liveUrl && <p className="text-xs text-muted">{t.notLive}</p>}
        </div>

        <div className="card flex flex-col gap-2">
          <span className="text-sm font-semibold">{t.logo}</span>
          <ImageField value={doc.logoUrl} onPick={() => setPicker(() => (url: string) => change({ ...doc, logoUrl: url }))} onClear={() => change({ ...doc, logoUrl: null })} />
        </div>

        <h2 className="mt-2 font-semibold">{t.sections}</h2>
        <ol className="flex flex-col gap-2">
          {doc.sections.map((s, i) => {
            const isOpen = open === s.id;
            const d = s.data as Data;
            const label = (typeof d.title === "string" && d.title) || (typeof d.headline === "string" && d.headline) || "";
            return (
              <li
                key={s.id}
                draggable
                onDragStart={() => (drag.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag.current !== null) move(drag.current, i);
                  drag.current = null;
                }}
                className={`rounded-2xl border bg-white ${isOpen ? "border-brand-500 shadow-sm" : "border-neutral-200"} ${s.visible ? "" : "opacity-60"}`}
              >
                <div className="flex items-center gap-1 p-2">
                  <span className="cursor-grab p-1 text-muted" title={t.drag}><GripVertical className="h-4 w-4" aria-hidden="true" /></span>
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 flex-col items-start px-1 text-left">
                    <span className="text-sm font-semibold">{t.types[s.type]}</span>
                    {label && <span className="w-full truncate text-xs text-muted">{label}</span>}
                  </button>
                  <IconButton label={s.visible ? t.hide : t.show} onClick={() => setSections(doc.sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))}>
                    {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </IconButton>
                  <IconButton label={t.up} onClick={() => move(i, i - 1)} disabled={i === 0}><ChevronUp className="h-4 w-4" /></IconButton>
                  <IconButton label={t.down} onClick={() => move(i, i + 1)} disabled={i === doc.sections.length - 1}><ChevronDown className="h-4 w-4" /></IconButton>
                  <IconButton label={t.remove} onClick={() => window.confirm(t.removeConfirm) && setSections(doc.sections.filter((x) => x.id !== s.id))}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
                {isOpen && (
                  <div className="flex flex-col gap-3 border-t border-neutral-100 p-3">
                    {FIELDS[s.type].map((f) =>
                      f.kind === "list" ? (
                        <ListEditor key={f.key} field={f} items={(d[f.key] as Data[]) ?? []} onChange={(items) => patch(s.id, { [f.key]: items })} pick={setPicker} />
                      ) : (
                        <FieldEditor key={f.key} field={f} value={d[f.key]} onChange={(v) => patch(s.id, { [f.key]: v })} pick={setPicker} />
                      ),
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <label className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-700" aria-hidden="true" />
          <span className="sr-only">{t.add}</span>
          <select
            value=""
            onChange={(e) => e.target.value && add(e.target.value as SectionType)}
            className={input}
            aria-label={t.add}
          >
            <option value="">{t.add} …</option>
            {SECTION_TYPES.map((type) => <option key={type} value={type}>{t.types[type]}</option>)}
          </select>
        </label>
      </div>

      {/* Live preview */}
      <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-2 xl:self-start">
        <div className="flex gap-2 self-end">
          {(["desktop", "mobile"] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${device === d ? "border-brand-700 bg-brand-50 text-brand-800" : "border-neutral-300"}`}>
              {d === "desktop" ? <Monitor className="h-4 w-4" aria-hidden="true" /> : <Smartphone className="h-4 w-4" aria-hidden="true" />} {t[d]}
            </button>
          ))}
        </div>
        <PreviewFrame device={device} frame={frame} />
      </div>

      {picker && <MediaPicker media={media} onUpload={onUpload} onPick={(url) => { picker(url); setPicker(null); }} onClose={() => setPicker(null)} />}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className="rounded-lg p-1.5 text-ink/70 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-30">
      {children}
    </button>
  );
}

/** Scales a 1280 px wide desktop frame down to the available width; the phone frame is 390 px. */
function PreviewFrame({ device, frame }: { device: "desktop" | "mobile"; frame: React.RefObject<HTMLIFrameElement | null> }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / 1280)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const desktop = device === "desktop";
  const height = 860;
  return (
    <div ref={box} className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100" style={{ height: desktop ? height * scale : height }}>
      <iframe
        ref={frame}
        src="/vorschau/karriere"
        title="Vorschau"
        className={desktop ? "origin-top-left border-0 bg-white" : "mx-auto my-0 block border-0 bg-white shadow-xl"}
        style={desktop ? { width: 1280, height, transform: `scale(${scale})` } : { width: 390, height }}
      />
    </div>
  );
}

function FieldEditor({ field, value, onChange, pick }: { field: Field; value: unknown; onChange: (v: unknown) => void; pick: (fn: () => (url: string) => void) => void }) {
  const t = getMessages().editor;
  const label = t.fields[field.key] ?? field.key;
  if (field.kind === "image") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink/70">{label}</span>
        <ImageField value={typeof value === "string" ? value : null} onPick={() => pick(() => (url: string) => onChange(url))} onClear={() => onChange(null)} />
      </div>
    );
  }
  const v = typeof value === "string" ? value : "";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-ink/70">{label}</span>
      {field.kind === "textarea" ? (
        <textarea value={v} onChange={(e) => onChange(e.target.value)} rows={field.key === "body" ? 8 : 3} className={input} />
      ) : (
        <input value={v} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
    </label>
  );
}

function ListEditor({ field, items, onChange, pick }: { field: ListField; items: Data[]; onChange: (items: Data[]) => void; pick: (fn: () => (url: string) => void) => void }) {
  const t = getMessages().editor;
  const blank = () => Object.fromEntries(field.fields.map((f) => [f.key, f.kind === "image" ? null : ""]));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="relative flex flex-col gap-2 rounded-xl bg-canvas p-3 pr-10">
          {field.fields.map((f) => (
            <FieldEditor key={f.key} field={f} value={item[f.key]} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} pick={pick} />
          ))}
          <div className="absolute top-2 right-1 flex flex-col">
            <IconButton label={t.removeItem} onClick={() => onChange(items.filter((_, j) => j !== i))}><X className="h-4 w-4" /></IconButton>
            <IconButton label={t.up} disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}><ChevronUp className="h-4 w-4" /></IconButton>
          </div>
        </div>
      ))}
      {items.length < field.max && (
        <button type="button" onClick={() => onChange([...items, blank()])} className="inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-sm font-semibold text-brand-800 hover:bg-brand-50">
          <Plus className="h-4 w-4" aria-hidden="true" /> {t.addItem}
        </button>
      )}
    </div>
  );
}

function ImageField({ value, onPick, onClear }: { value: string | null; onPick: () => void; onClear: () => void }) {
  const t = getMessages().editor;
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onPick} className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-white hover:border-brand-500">
        {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-muted" aria-label={t.noImage} />}
      </button>
      <div className="flex flex-col items-start gap-1 text-sm">
        <button type="button" onClick={onPick} className="font-semibold text-brand-800 hover:underline">{t.chooseImage}</button>
        {value && <button type="button" onClick={onClear} className="text-muted hover:underline">{t.removeImage}</button>}
      </div>
    </div>
  );
}

function MediaPicker({ media, onUpload, onPick, onClose }: { media: string[]; onUpload: (f: File) => Promise<{ ok: boolean; error?: string }>; onPick: (url: string) => void; onClose: () => void }) {
  const t = getMessages().editor;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div role="dialog" aria-modal="true" aria-label={t.media} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.media}</h2>
          <IconButton label={t.close} onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </div>
        <p className="text-sm text-muted">{t.mediaHint}</p>
        <label className="btn-secondary cursor-pointer self-start py-2">
          {busy ? t.uploading : t.upload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              setError(null);
              const r = await onUpload(f);
              setBusy(false);
              if (!r.ok) setError(t.uploadError[r.error ?? "error"] ?? t.uploadError.error);
              e.target.value = "";
            }}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <ul className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {media.map((url) => (
            <li key={url}>
              <button type="button" onClick={() => onPick(url)} className="block aspect-square w-full overflow-hidden rounded-xl border border-neutral-200 bg-canvas hover:border-brand-500 hover:ring-2 hover:ring-brand-500">
                <img src={url} alt="" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
