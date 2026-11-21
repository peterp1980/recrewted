import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PreviewReceiver } from "./PreviewReceiver";

export const metadata: Metadata = { robots: { index: false } };

/** Embedded by the career page editor; shows the draft it sends. Signed-in users only. */
export default async function CareerPreviewPage() {
  if (!(await getSession())) redirect("/login");
  return <PreviewReceiver />;
}
