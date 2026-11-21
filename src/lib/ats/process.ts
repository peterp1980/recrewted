import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { decryptSecret } from "./crypto";
import { isProvider, PROVIDER_INFO, pushCandidate, type Candidate } from "./providers";

// Works off queued handovers (0022): one candidate per call into the customer's ATS.
// Retries temporary errors up to five times (cron daily, plus right after a status change).

const MAX_ATTEMPTS = 5;
export const masterSecret = () => process.env.DATA_REQUEST_SECRET ?? null;

export async function processAtsTransfers(limit = 20): Promise<{ sent: number; failed: number; retry: number }> {
  const master = masterSecret();
  const out = { sent: 0, failed: 0, retry: 0 };
  if (!master) return out;
  const admin = createAdminClient();
  const { data: claimed, error } = await admin.rpc("claim_ats_transfers", { max_count: limit });
  if (error) throw new Error(`claim_ats_transfers failed: ${error.message}`);

  for (const t of claimed ?? []) {
    const [{ data: conn }, { data: app }] = await Promise.all([
      admin.from("ats_connections").select("provider, enabled, config, secret_enc").eq("id", t.connection_id).single(),
      admin.from("applications").select("id, status, cv_storage_path, candidates(first_name, last_name, email, phone), vacancies(title, ats_job_id, organizations(blind_review))").eq("id", t.application_id).single(),
    ]);
    const finish = async (patch: { status: string; error?: string | null; external_id?: string | null; sent_at?: string }) => {
      await admin.from("ats_transfers").update({ error: null, ...patch }).eq("id", t.id);
    };
    if (!conn || !app?.candidates || !app.vacancies || !isProvider(conn.provider)) {
      await finish({ status: "failed", error: "Verbindung oder Bewerbung nicht mehr vorhanden." });
      out.failed++;
      continue;
    }
    // Blind review: identity goes to the customer's ATS only once they chose to meet the candidate.
    if (app.vacancies.organizations?.blind_review && !["interview", "hired"].includes(app.status)) {
      await finish({ status: "failed", error: "Anonyme Vorauswahl: Übergabe erst nach „Gespräch vereinbart“. Danach erneut übergeben." });
      out.failed++;
      continue;
    }
    const secret = conn.secret_enc ? decryptSecret(conn.secret_enc, master) : null;
    if (!conn.enabled || !secret) {
      await finish({ status: "failed", error: conn.enabled ? "API-Key fehlt oder ist nicht lesbar – bitte neu eingeben." : "Integration ist ausgeschaltet." });
      out.failed++;
      continue;
    }

    let cv: Candidate["cv"] = null;
    if (app.cv_storage_path && PROVIDER_INFO[conn.provider].sendsCv) {
      const [dl, signed] = await Promise.all([
        admin.storage.from("cvs").download(app.cv_storage_path),
        admin.storage.from("cvs").createSignedUrl(app.cv_storage_path, 3600),
      ]);
      if (dl.data && signed.data?.signedUrl) {
        const ext = app.cv_storage_path.split(".").pop() ?? "pdf";
        cv = { bytes: new Uint8Array(await dl.data.arrayBuffer()), filename: `Lebenslauf ${app.candidates.first_name} ${app.candidates.last_name}.${ext}`, contentType: dl.data.type || "application/pdf", url: signed.data.signedUrl };
      }
    }
    const result = await pushCandidate(
      conn.provider,
      { config: (conn.config ?? {}) as Record<string, string>, secret, fetch },
      {
        firstName: app.candidates.first_name,
        lastName: app.candidates.last_name,
        email: app.candidates.email,
        phone: app.candidates.phone,
        jobId: app.vacancies.ats_job_id,
        jobTitle: app.vacancies.title,
        note: `Vorqualifiziert über recrewted. Bewertungsbogen: ${siteUrl()}/portal/applications/${app.id}`,
        cv,
      },
    );
    if (result.ok) {
      await finish({ status: "sent", external_id: result.externalId, sent_at: new Date().toISOString() });
      out.sent++;
    } else if (result.retry && t.attempts < MAX_ATTEMPTS) {
      await finish({ status: "pending", error: result.error });
      out.retry++;
    } else {
      await finish({ status: "failed", error: result.error });
      await admin.from("ats_connections").update({ last_error: result.error }).eq("id", t.connection_id);
      out.failed++;
    }
  }
  return out;
}
