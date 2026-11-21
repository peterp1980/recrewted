import type { Instrumentation } from "next";

/**
 * F18: every server error is logged as one JSON line (Vercel → Logs, filter
 * level=error). No request bodies or personal data – only route and digest.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      msg: e.message?.slice(0, 500),
      digest: e.digest,
      method: request.method,
      path: request.path.split("?")[0],
      route: context.routePath,
      kind: context.routeType,
      at: new Date().toISOString(),
    }),
  );
};
