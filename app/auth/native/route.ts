import { NextResponse } from "next/server"

/** Captured by Expo after Google sign-in. Do not exchange the `code` here — the app does. */
export function GET(request: Request) {
  const incoming = new URL(request.url)
  const qs = incoming.searchParams.toString()
  const deepLink = `jobmatch://auth/callback${qs ? `?${qs}` : ""}`
  const safeHref = deepLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
  const jsUrl = JSON.stringify(deepLink)

  return new NextResponse(
    `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Opening swypejobs</title>
  </head>
  <body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#050506;color:#fff;font-family:system-ui,sans-serif">
    <p>Returning to swypejobs…</p>
    <a id="open-app" href="${safeHref}" style="color:#fff">Open swypejobs</a>
    <script>
      (function () {
        var target = ${jsUrl};
        var hash = location.hash ? location.hash.replace(/^#/, "") : "";
        if (hash) target += (target.indexOf("?") === -1 ? "?" : "&") + hash;
        var link = document.getElementById("open-app");
        if (link) link.setAttribute("href", target);
        try { location.replace(target); } catch (e) {}
      })();
    </script>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  )
}
