import { PassThrough } from "node:stream";

import type { AppLoadContext, EntryContext } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";

export const streamTimeout = 5_000;

/**
 * Security headers for every rendered document.
 * - Pages are frame-protected (clickjacking) except the public widget at /embed/*,
 *   which is meant to be framed from any site.
 * - script-src is an allow-list ('self' + inline), not nonce-based: the app relies on inline scripts (theme, hydration).
 */
function applySecurityHeaders(request: Request, headers: Headers) {
  const { pathname } = new URL(request.url);
  const embed = pathname.startsWith("/embed/");
  // Hardening that never needs inline-script exceptions. Only in production: the Vite dev server
  // injects its own inline/eval helpers. 'unsafe-inline' stays because hydration and the theme
  // script are inline; the allow-list still blocks scripts loaded from other origins.
  const hardening = import.meta.env.PROD
    ? "; object-src 'none'; base-uri 'self'; script-src 'self' 'unsafe-inline'"
    : "";
  if (embed) {
    headers.set("Content-Security-Policy", `frame-ancestors *${hardening}`);
    headers.delete("X-Frame-Options");
  } else {
    headers.set(
      "Content-Security-Policy",
      `frame-ancestors 'self'${hardening}${import.meta.env.PROD ? "; form-action 'self'" : ""}`,
    );
    headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  applySecurityHeaders(request, responseHeaders);

  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");

    // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
    // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
    let readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    // Abort the rendering stream after the `streamTimeout` so it has time to
    // flush down the rejected boundaries
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1000,
    );

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              // Clear the timeout to prevent retaining the closure and memory leak
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
  });
}
