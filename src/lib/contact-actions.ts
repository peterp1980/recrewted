"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { processCrmOutbox } from "@/lib/crm/process";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendContactRequest(form: FormData) {
  if (String(form.get("website") ?? "") !== "") redirect("/kontakt?s=sent"); // honeypot
  const s = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const name = s("name", 120);
  const email = s("email", 254).toLowerCase();
  const message = s("message", 3000);
  if (name.length < 2 || !EMAIL.test(email) || message.length < 5 || form.get("consent") !== "on") redirect("/kontakt?s=invalid");
  const { error } = await createAdminClient().from("contact_requests").insert({ name, email, message, company: s("company", 150) || null, phone: s("phone", 40) || null });
  // The request becomes a Pipedrive lead (queued by a trigger, 0029).
  if (!error) after(() => processCrmOutbox(5).catch((e) => console.error("crm lead failed", e)));
  redirect(`/kontakt?s=${error ? "invalid" : "sent"}`);
}
