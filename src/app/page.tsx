import Link from "next/link";
import { Mark } from "@/components/Mark";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { LandingDemo } from "@/components/LandingDemo";
import { HeroGlow } from "@/components/HeroGlow";
import { Reveal } from "@/components/Reveal";
import { RouteMatcher } from "@/components/RouteMatcher";
import { EqualHeightCards } from "@/components/EqualHeightCards";
import { ClockIcon, AlertIcon, RouteIcon } from "@/components/FeatureIcons";

const ROUTES = [
  { method: "GET", path: "/orders" },
  { method: "POST", path: "/orders" },
  { method: "GET", path: "/orders/:id" },
  { method: "PATCH", path: "/orders/:id/refund" },
  { method: "GET", path: "/users/me" },
  { method: "POST", path: "/auth/token" },
  { method: "GET", path: "/catalog?page=2" },
  { method: "DELETE", path: "/sessions/:sid" },
  { method: "GET", path: "/webhooks/log" },
  { method: "POST", path: "/payments/intent" },
  { method: "PUT", path: "/settings/notifications" },
  { method: "GET", path: "/orders/*" },
];

const METHOD_COLOR: Record<string, string> = {
  GET: "var(--ok)",
  POST: "var(--accent)",
  PATCH: "var(--client-err)",
  PUT: "var(--client-err)",
  DELETE: "var(--server-err)",
};

export default function LandingPage() {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <header className="topbar" style={{ position: "sticky", top: 0, zIndex: 6 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit" }}>
          <Mark />
          <span className="wordmark">Mockbird</span>
        </Link>
        <span style={{ flex: 1 }} />
        <a href="#states" className="nav-link hide-mobile">
          How it works
        </a>
        <Link href="/w" className="nav-link">
          My workspaces
        </Link>
        <ThemeSwitch />
        <a href="#demo" className="btn btn-sm btn-primary hide-mobile">
          Start free
        </a>
      </header>

      <main className="shell">
        <section
          className="hero"
          style={{
            // .shell has a 16px top padding that sits above .hero, outside
            // .hero-bg's coverage and outside the pointer-tracked rect — a
            // dead strip with no gradient and no cursor-follow. Pulling the
            // section up by that same amount and padding it back down
            // internally lets the hero's own background fill that strip too,
            // without moving the visible content (badge/heading) down.
            padding: "40px 0 8px",
            margin: "-16px -20px 0",
            paddingInline: 20,
          }}
        >
          <div className="hero-bg">
            <div className="hero-mesh" />
            <HeroGlow />
          </div>

          <span className="badge-pill">
            <span className="badge-dot" />
            Live URL in five seconds
          </span>

          <h1 style={{ maxWidth: "28ch", fontSize: "clamp(34px, 5.6vw, 58px)", marginTop: 18 }}>
            Your API, before you write
            <br />
            <span className="gradient-text">a line of it.</span>
          </h1>
          <p className="muted" style={{ maxWidth: "58ch", marginTop: 16, fontSize: 15.5 }}>
            Describe an endpoint in plain English. Mockbird returns realistic JSON at a live URL —
            with the delays and failures you need to build against.
          </p>

          <div id="demo" className="demo-frame" style={{ marginTop: 28, scrollMarginTop: 84 }}>
            <div className="demo-inner">
              <LandingDemo origin={origin} />
            </div>
          </div>
        </section>

        <section
          className="panel"
          style={{
            marginTop: 40,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 10px 26px rgba(var(--ink-rgb), 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 16px",
              borderBottom: "1px solid var(--rule)",
              fontFamily: "var(--mono)",
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--ink-45)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flex: "none" }} />
            ANY PATH, ANY METHOD
          </div>
          <div className="route-marquee">
            <div className="route-marquee-track">
              {[...ROUTES, ...ROUTES].map((r, i) => (
                <span className="route-pill" key={i}>
                  <code
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      color: METHOD_COLOR[r.method],
                    }}
                  >
                    {r.method}
                  </code>
                  <code className="mono" style={{ fontSize: 12.5, color: "var(--ink-70)" }}>
                    {r.path}
                  </code>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="states" style={{ marginTop: 56, scrollMarginTop: 84 }}>
          <h2 style={{ fontSize: "clamp(22px, 3.4vw, 30px)", maxWidth: "22ch" }}>
            Test the states you can&apos;t fake.
          </h2>
          <p className="muted" style={{ maxWidth: "60ch", marginTop: 12, fontSize: 15 }}>
            A real backend is slow, occasionally broken, and particular about routes. Mockbird lets
            you turn each of those on and off per endpoint.
          </p>

          <EqualHeightCards>
            <Reveal>
              <div className="feature-card">
                <span className="feature-icon">
                  <ClockIcon />
                </span>
                <h3>Slow it down</h3>
                <p className="muted small" style={{ marginTop: 6 }}>
                  Set a delay in milliseconds and your loading state finally has something to load.
                </p>

                <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="small muted">Applies to</span>
                  <code className="mono small" style={{ color: "var(--ink-70)" }}>
                    GET /orders/:id
                  </code>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="state-progress">
                    <span className="state-progress-dot" />
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--ink-35)",
                    }}
                  >
                    <span>request</span>
                    <span style={{ color: "var(--accent)" }}>delay 2000ms</span>
                    <span>response</span>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "0s", width: "6%", note: "default" },
                    { label: "2s", width: "45%", note: "your setting", active: true },
                    { label: "8s", width: "100%", note: "hard cap" },
                  ].map((d) => (
                    <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <code
                        className="mono"
                        style={{ fontSize: 11, flex: "none", width: 24, color: d.active ? "var(--accent)" : "var(--ink-45)" }}
                      >
                        {d.label}
                      </code>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: 5,
                          borderRadius: 3,
                          background: "var(--rule-soft)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            inset: "0 auto 0 0",
                            width: d.width,
                            background: d.active ? "var(--accent)" : "var(--ink-35)",
                            borderRadius: 3,
                          }}
                        />
                      </span>
                      <span className="small" style={{ flex: "none", color: "var(--ink-35)" }}>
                        {d.note}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="small muted" style={{ marginTop: 12 }}>
                  Capped at 8s by the serverless function timeout.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="feature-card">
                <span className="feature-icon">
                  <AlertIcon />
                </span>
                <h3>Break it on purpose</h3>
                <p className="muted small" style={{ marginTop: 6 }}>
                  Give an endpoint a failure rate. Your error path gets exercised before a customer
                  finds it.
                </p>

                <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="small muted">This endpoint</span>
                  <code className="mono small" style={{ color: "var(--server-err)" }}>
                    20% → 503
                  </code>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="state-bars">
                    {[0, 0, 1, 0, 0, 0, 1, 0, 0, 0].map((fail, i) => (
                      <span key={i} className={fail ? "state-bar state-bar-fail" : "state-bar"} />
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--ink-35)",
                    }}
                  >
                    <span>10 requests</span>
                    <span style={{ color: "var(--server-err)" }}>2 × 503</span>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[400, 401, 403, 404, 429, 500, 502, 503].map((code) => (
                    <span
                      key={code}
                      className="mono"
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 999,
                        border: `1px solid ${code === 503 ? "var(--server-err)" : "var(--rule)"}`,
                        color: code === 503 ? "var(--server-err)" : "var(--ink-45)",
                        background: code === 503 ? "rgba(var(--server-err-rgb), 0.08)" : "transparent",
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>

                <pre className="code" style={{ marginTop: 12, padding: "9px 11px", fontSize: 11.5, borderRadius: 4 }}>
                  {`HTTP/1.1 503 Service Unavailable\n{ "error": "Service Unavailable" }`}
                </pre>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="feature-card">
                <span className="feature-icon">
                  <RouteIcon />
                </span>
                <h3>Exact path matching</h3>
                <p className="muted small" style={{ marginTop: 6 }}>
                  Static beats dynamic beats wildcard, so <code className="mono">/orders/new</code>{" "}
                  never gets swallowed by <code className="mono">/orders/:id</code>.
                </p>
                <div style={{ marginTop: 14 }}>
                  <RouteMatcher compact />
                </div>
              </div>
            </Reveal>
          </EqualHeightCards>
        </section>

        <Reveal>
          <section style={{ marginTop: 48, borderTop: "1px solid var(--rule)", paddingTop: 26 }}>
            <h2>No model runs when your app calls the mock</h2>
            <p className="muted" style={{ maxWidth: "68ch", marginTop: 10 }}>
              The AI is used once, when you create the endpoint, to turn your sentence into a
              schema and some sample records. After that the response is read from the database
              and returned verbatim. The same request returns the same bytes every time, which is
              the only way a mock is useful to build a UI against.
            </p>
          </section>
        </Reveal>

        <section
          className="panel"
          style={{
            marginTop: 48,
            borderRadius: 16,
            padding: "clamp(24px, 4vw, 40px)",
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 14px 34px rgba(var(--ink-rgb), 0.08)",
            background:
              "radial-gradient(560px circle at 88% -25%, rgba(var(--accent-rgb), 0.14), transparent 60%), var(--surface)",
          }}
        >
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 26px)", maxWidth: "22ch" }}>
              Point your app somewhere real.
            </h2>
            <p className="muted" style={{ marginTop: 10, maxWidth: "46ch", fontSize: 14.5 }}>
              Five endpoints free, no card. Swap the base URL when your backend lands.
            </p>
          </div>
          <div style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <Link className="btn btn-primary" href="/w" style={{ padding: "10px 18px" }}>
              Create a workspace
            </Link>
            <span className="small" style={{ fontFamily: "var(--mono)", color: "var(--ink-35)" }}>
              no install · no schema · no seed data
            </span>
          </div>
        </section>

        <footer className="muted small" style={{ marginTop: 40, borderTop: "1px solid var(--rule)", paddingTop: 16 }}>
          Mocks are public to anyone who has the workspace key. Don&apos;t put real data in them.
        </footer>
      </main>
    </>
  );
}
