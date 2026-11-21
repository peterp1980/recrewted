import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CareerSections } from "@/components/career/CareerSections";
import { getMessages } from "@/i18n";
import { jobCards } from "@/lib/careers/cards";
import { jsonLdScript } from "@/lib/jobs/format";
import { getCareerPage } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// Same freshness as the job board: filled vacancies disappear within the hour (F11).
export const revalidate = 300;

async function load(slug: string) {
  const page = await getCareerPage(slug).catch((e) => {
    console.error("career page lookup failed", e);
    return null;
  });
  if (!page) notFound();
  return page;
}

const heroImage = (page: Awaited<ReturnType<typeof load>>) =>
  page.doc.sections.find((s) => s.type === "hero" && s.visible)?.data as { imageUrl?: string | null } | undefined;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  const t = getMessages().careers;
  const img = heroImage(page)?.imageUrl;
  return {
    title: t.metaTitle(page.name),
    description: t.metaDescription(page.name, page.jobs.length),
    alternates: { canonical: `${siteUrl()}/karriere/${page.slug}` },
    openGraph: img ? { images: [{ url: img }] } : undefined,
  };
}

export default async function CareerPage({ params }: Props) {
  const page = await load((await params).slug);
  const logo = page.doc.logoUrl;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: page.name,
    ...(page.website ? { url: page.website } : {}),
    ...(logo ? { logo: logo.startsWith("/") ? `${siteUrl()}${logo}` : logo } : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <CareerSections doc={page.doc} name={page.name} website={page.website} color={page.brandColor} tone={page.tone} jobs={jobCards(page.jobs)} />
    </>
  );
}
