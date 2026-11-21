"use client";

import { useActionState, useState } from "react";
import { applyMessages, getMessages, type Tone } from "@/i18n";
import { MAX_CV_BYTES } from "@/lib/apply/parse";
import type { ScreeningQuestion } from "@/lib/screening/rules";
import { prepareCvUpload, submitApplication, type ApplyState } from "./actions";

type Props = { slug: string; questions: ScreeningQuestion[]; utm: Record<string, string>; tone: Tone };
type Upload = { state: "idle" | "uploading" | "done" | "error"; path: string; name: string };

const input = "w-full rounded-lg border border-neutral-300 px-3 py-3 text-base";
const initial: ApplyState = { errors: [], missingQuestions: [], values: {} };

/** Mobile-first short application. Keeps typed values when the server reports an error. */
export function ApplyForm({ slug, questions, utm, tone }: Props) {
  const t = applyMessages(tone);
  const [state, action, pending] = useActionState(submitApplication, initial);
  const [upload, setUpload] = useState<Upload>({ state: "idle", path: "", name: "" });

  async function onFile(file: File | undefined) {
    if (!file) return setUpload({ state: "idle", path: "", name: "" });
    if (file.size > MAX_CV_BYTES) return setUpload({ state: "error", path: "", name: file.name });
    setUpload({ state: "uploading", path: "", name: file.name });
    const target = await prepareCvUpload();
    if (!target) return setUpload({ state: "error", path: "", name: file.name });
    // Loaded only when a file is chosen, to keep the form light on mobile.
    const { createClient } = await import("@/lib/supabase/client");
    const { error } = await createClient().storage.from("cvs").uploadToSignedUrl(target.path, target.token, file, { contentType: file.type || "application/octet-stream" });
    setUpload(error ? { state: "error", path: "", name: file.name } : { state: "done", path: target.path, name: file.name });
  }
  const v = state.values;
  const has = (e: ApplyState["errors"][number]) => state.errors.includes(e);
  const err = (e: ApplyState["errors"][number], id: string) =>
    has(e) ? <p id={id} className="text-sm text-red-700">{t.errors[e]}</p> : null;
  const generalErrors = (["duplicate", "closed", "server"] as const).filter(has);
  const cvPath = upload.state === "done" ? upload.path : (v.cvPath ?? "");

  return (
    // key forces fresh defaultValues after an error round-trip (React resets forms after actions)
    <form key={JSON.stringify(state)} action={action} className="flex flex-col gap-5" noValidate={false}>
      {generalErrors.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">{generalErrors.map((e) => <p key={e}>{t.errors[e]}</p>)}</div>
      )}
      <input type="hidden" name="slug" value={slug} />
      {Object.entries(utm).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
      <div aria-hidden="true" className="hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-medium">{t.firstName}</span>
          <input name="firstName" required autoComplete="given-name" defaultValue={v.firstName} className={input} aria-invalid={has("firstName") || undefined} aria-describedby={has("firstName") ? "e-fn" : undefined} />
          {err("firstName", "e-fn")}
        </label>
        <label className="grid gap-1">
          <span className="font-medium">{t.lastName}</span>
          <input name="lastName" required autoComplete="family-name" defaultValue={v.lastName} className={input} aria-invalid={has("lastName") || undefined} aria-describedby={has("lastName") ? "e-ln" : undefined} />
          {err("lastName", "e-ln")}
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 font-medium">{t.contactHint}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span>{t.email}</span>
            <input name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} className={input} aria-invalid={has("email") || has("contact") || undefined} />
            {err("email", "e-em")}
          </label>
          <label className="grid gap-1">
            <span>{t.phone}</span>
            <input name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} className={input} aria-invalid={has("phone") || has("contact") || undefined} />
            {err("phone", "e-ph")}
          </label>
        </div>
        {err("contact", "e-co")}
      </fieldset>

      {questions.length > 0 && (
        <fieldset className="grid gap-4">
          <legend className="mb-1 text-lg font-semibold">{t.questions}</legend>
          {err("questions", "e-q")}
          {questions.map((q) => {
            const name = `q_${q.id}`;
            const missing = state.missingQuestions.includes(q.id);
            return (
              <div key={q.id} className={`grid gap-2 rounded-lg p-3 ${missing ? "bg-red-50" : "bg-white"}`}>
                {q.kind === "yes_no" ? (
                  <fieldset>
                    <legend className="mb-2">{q.question}{!q.required && <span className="ml-2 text-sm text-muted">({t.recommended})</span>}</legend>
                    <div className="flex gap-3">
                      {(["yes", "no"] as const).map((a) => (
                        <label key={a} className="flex min-w-24 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3">
                          <input type="radio" name={name} value={a} required={q.required} defaultChecked={v[name] === a} />
                          {a === "yes" ? t.yes : t.no}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : q.kind === "choice" ? (
                  <label className="grid gap-2">
                    <span>{q.question}{!q.required && <span className="ml-2 text-sm text-muted">({t.recommended})</span>}</span>
                    <select name={name} required={q.required} defaultValue={v[name] ?? ""} className={input}>
                      <option value="" disabled>{t.choose}</option>
                      {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="grid gap-2">
                    <span>{q.question}{!q.required && <span className="ml-2 text-sm text-muted">({t.recommended})</span>}</span>
                    <input name={name} required={q.required} inputMode="decimal" defaultValue={v[name]} className={`${input} max-w-40`} />
                  </label>
                )}
              </div>
            );
          })}
        </fieldset>
      )}

      <label className="grid gap-1">
        <span className="font-medium">{t.cv}</span>
        <span className="text-sm text-muted">{t.cvHint}</span>
        {/* no name: the file goes straight to storage, only its path is submitted */}
        <input type="file" accept=".pdf,.docx,image/jpeg,image/png,image/webp,image/heic" className="text-base" onChange={(e) => onFile(e.currentTarget.files?.[0])} />
        <input type="hidden" name="cvPath" value={cvPath} />
        <p aria-live="polite" className="text-sm text-ink/80">
          {upload.state === "uploading" ? t.cvUploading : upload.state === "done" ? t.cvDone(upload.name) : ""}
        </p>
        {upload.state === "error" && <p className="text-sm text-red-700">{t.errors.cvSize}</p>}
        {err("cvSize", "e-cs")}
        {err("cvType", "e-ct")}
      </label>

      <div className="grid gap-3">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="processingConsent" required defaultChecked={v.processingConsent === "on"} className="mt-1 h-5 w-5 shrink-0" aria-invalid={has("consent") || undefined} />
          <span>{t.consent}</span>
        </label>
        {err("consent", "e-cn")}
        <p className="text-sm text-muted">{t.aiNotice}</p>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="talentPoolConsent" defaultChecked={v.talentPoolConsent === "on"} className="mt-1 h-5 w-5 shrink-0" />
          <span className="text-ink/80">{t.talentPool}</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="whatsappOptIn" defaultChecked={v.whatsappOptIn === "on"} className="mt-1 h-5 w-5 shrink-0" />
          <span className="text-ink/80">{t.whatsapp}</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="profileOptIn" defaultChecked={v.profileOptIn === "on"} className="mt-1 h-5 w-5 shrink-0" />
          <span className="text-ink/80">{getMessages().profile.applyOptIn}</span>
        </label>
      </div>

      <button type="submit" disabled={pending || upload.state === "uploading"} className="rounded-lg bg-brand-700 px-5 py-4 text-lg font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? t.sending : t.submit}
      </button>
    </form>
  );
}
