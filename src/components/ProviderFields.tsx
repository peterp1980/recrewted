"use client";

import { useState } from "react";
import type { ProviderInfo } from "@/lib/ats/providers";

const field = "w-full rounded-lg border border-neutral-300 px-3 py-2";

type Props = {
  providers: Record<string, Omit<ProviderInfo, "fields"> & { fields: { key: string; label: string; hint?: string; required: boolean }[] }>;
  initial: string;
  config: Record<string, string>;
  keyHint: string | null;
  savedProvider: string | null;
  labels: { provider: string; key: string; keyStored: string; keyNote: string };
};

/** System picker; the settings fields change with the chosen system. */
export function ProviderFields({ providers, initial, config, keyHint, savedProvider, labels }: Props) {
  const [p, setP] = useState(initial);
  const info = providers[p];
  const keyKept = keyHint && savedProvider === p;
  return (
    <>
      <label className="grid gap-1">
        <span className="font-medium">{labels.provider}</span>
        <select name="provider" value={p} onChange={(e) => setP(e.target.value)} className={field}>
          {Object.entries(providers).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
      </label>
      {info.fields.map((f) => (
        <label key={`${p}-${f.key}`} className="grid gap-1">
          <span className="font-medium">{f.label}</span>
          {f.hint && <span className="text-sm text-muted">{f.hint}</span>}
          <input name={`cfg_${f.key}`} defaultValue={savedProvider === p ? (config[f.key] ?? "") : ""} required={f.required} autoComplete="off" spellCheck={false} className={field} />
        </label>
      ))}
      <label className="grid gap-1">
        <span className="font-medium">{info.secretLabel}</span>
        <span className="text-sm text-muted">{info.secretHint}</span>
        <input name="secret" type="password" autoComplete="new-password" spellCheck={false} placeholder={keyKept ? labels.keyStored : ""} className={field} />
        <span className="text-xs text-muted">{keyKept ? labels.keyStored : labels.keyNote}</span>
      </label>
    </>
  );
}
