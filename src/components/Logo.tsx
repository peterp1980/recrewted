import Image from "next/image";
import Link from "next/link";

/** recrewted word mark (from the existing brand). */
export function Logo({ href = "/", className = "h-7 w-auto" }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="recrewted – Startseite" className="inline-flex shrink-0 items-center">
      <Image src="/brand/recrewted-logo.png" alt="recrewted" width={600} height={98} priority className={className} />
    </Link>
  );
}
