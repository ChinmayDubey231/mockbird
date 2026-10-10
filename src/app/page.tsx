import Link from "next/link";
import { Fragment } from "react";
import { Cmyk, ColorBar, Numeral } from "@/components/home/Cmyk";
import { CloseCta } from "@/components/home/CloseCta";
import { DemoProvider } from "@/components/home/DemoContext";
import { EditionToggle } from "@/components/EditionToggle";
import { StartFreeButton } from "@/components/home/HeaderActions";
import { BrandMark, GitHubIcon } from "@/components/home/Icons";
import { BrandMark as HeaderMark } from "@/components/icons";
import { OpenWorkspaceButton } from "@/components/home/OpenWorkspaceButton";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { SnippetCard, SnippetNotice } from "@/components/home/SnippetCard";
import { FailureStrip, RouteMatcherFigure } from "@/components/home/StateFigures";
import { TokenPlayground } from "@/components/home/TokenPlayground";
import { TopLink } from "@/components/home/TopLink";
import { TryItCard } from "@/components/home/TryItCard";

const REPO = "https://github.com/ChinmayDubey231/mockbird";

const ROUTES = [
  ["GET", "/orders"],
  ["POST", "/orders"],
  ["GET", "/orders/:id"],
  ["PATCH", "/orders/:id/refund"],
  ["GET", "/users/me"],
  ["POST", "/auth/token"],
  ["GET", "/catalog?page=2"],
  ["DELETE", "/sessions/:sid"],
  ["GET", "/webhooks/log"],
  ["POST", "/payments/intent"],
  ["PUT", "/settings/notifications"],
  ["GET", "/orders/*"],
];

const FACTS = [
  ["Live", "A real URL in about five seconds"],
  ["Latency", "Any delay up to 8,000 ms, per endpoint"],
  ["Failures", "A failure rate with the status you choose"],
  ["Routing", "Params, wildcards and a 404 that suggests the right path"],
];

export default function LandingPage() {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <DemoProvider origin={origin}>
      <div className="bs-page">
        {/* The same header as the workspace pages: their classes, and the
            design system's tokens through ds-scope, on this page's paper. */}
        <header className="ds-header ds-scope">
          <nav className="ds-shell ds-nav" aria-label="Main">
            <TopLink className="ds-brand">
              <HeaderMark />
              <span className="ds-brand-name">Mockbird</span>
            </TopLink>
            <a href={`${REPO}#readme`} className="ds-hide-sm">
              Docs
            </a>
            <Link href="/w">My workspaces</Link>
            <EditionToggle />
            <StartFreeButton />
          </nav>
        </header>

        <div className="ds-shell">
          <div className="ds-rail">
            <div className="bs-ticker">
              <span className="bs-kicker">Any path, any method</span>
              {ROUTES.map(([method, path]) => (
                <span key={method + path} className="bs-ticker-route">
                  <span className="bs-method" data-method={method}>
                    {method}
                  </span>
                  <code style={{ fontSize: 14 }}>{path}</code>
                </span>
              ))}
            </div>
          </div>
        </div>

        <main>
          {/* Not id="top": browsers treat #top as the top of the document, and
              the hero sits below the masthead. */}
          <section id="hero" className="bs-shell bs-hero">
            <h1 className="bs-h1">
              <span style={{ display: "block" }}>Your API, before you write</span>
              <Cmyk className="bs-h1-em">a line of it.</Cmyk>
            </h1>

            <div className="bs-hero-grid">
              <div className="bs-hero-copy">
                <p className="bs-hero-lede">
                  Describe an endpoint in a sentence. Mockbird serves realistic JSON from a live URL, and
                  lets you make it slow or make it fail, so the loading and error states get built today
                  instead of after the backend ships.
                </p>
                <dl className="bs-facts">
                  {FACTS.map(([term, detail]) => (
                    <Fragment key={term}>
                      <dt className="bs-kicker" data-tone={term.toLowerCase()}>
                        {term}
                      </dt>
                      <dd>{detail}</dd>
                    </Fragment>
                  ))}
                </dl>
                <div className="bs-hero-foot">
                  <ColorBar />
                  <span className="bs-muted" style={{ fontSize: 16 }}>
                    Five endpoints free. No card, no install, no seed data.
                  </span>
                  <OpenWorkspaceButton label="Open an empty workspace" />
                </div>
              </div>

              <TryItCard />
            </div>
          </section>

          <section id="states" className="bs-shell bs-section">
            <div className="bs-split">
              <h2 className="bs-h2 bs-col-5">Test the states you can&apos;t fake.</h2>
              <p className="bs-lede bs-col-7">
                A real backend is slow, sometimes broken, and particular about routes. Mockbird lets you
                switch each of those on per endpoint, so your loading, error and routing code runs before
                launch instead of after.
              </p>
            </div>

            <div className="bs-states">
              <article className="bs-state">
                <Numeral ink="c">1</Numeral>
                <h3 className="bs-h3">Slow it down</h3>
                <p>
                  Give any endpoint a delay of up to eight seconds. Skeletons, spinners and timeouts finally
                  have something to wait for.
                </p>
                <figure className="bs-figure">
                  <div className="bs-track" aria-hidden="true">
                    <span className="bs-track-fill" />
                    {Array.from({ length: 9 }, (_, i) => (
                      <span key={i} className="bs-tick" data-on={i <= 2} style={{ left: `${(i / 8) * 100}%` }} />
                    ))}
                    <span className="bs-traveller" />
                  </div>
                  <div className="bs-track-labels">
                    <span style={{ left: 0 }}>0 s</span>
                    <span className="bs-track-setting">2 s, your setting</span>
                    <span style={{ right: 0 }}>8 s cap</span>
                  </div>
                  <figcaption className="bs-caption">The cap is the serverless function timeout.</figcaption>
                </figure>
              </article>

              <article className="bs-state">
                <Numeral ink="m">2</Numeral>
                <h3 className="bs-h3">Break it on purpose</h3>
                <p>
                  Set a failure rate and that share of calls returns the error you pick, from 400 to 503.
                  Your error path runs before a customer finds it.
                </p>
                <figure className="bs-figure">
                  <FailureStrip />
                  <div className="bs-legend">
                    <span className="bs-muted">Last 20 calls at 20%</span>
                    <span>
                      <span style={{ color: "var(--color-accent-2-700)", fontWeight: 600 }}>4 × 503</span>
                      <span className="bs-muted"> · </span>
                      <span style={{ color: "var(--color-ok-700)" }}>16 × 200</span>
                    </span>
                  </div>
                  <figcaption className="bs-caption">
                    A failure returns at once, skipping the delay, like a real outage.
                  </figcaption>
                </figure>
              </article>

              <article className="bs-state">
                <Numeral ink="y">3</Numeral>
                <h3 className="bs-h3">Routes that match like a router</h3>
                <p>
                  Static beats parameter beats wildcard, so <code style={{ fontSize: "0.85em" }}>/orders/new</code>{" "}
                  is never swallowed by <code style={{ fontSize: "0.85em" }}>/orders/:id</code>. Any method, any
                  depth.
                </p>
                <RouteMatcherFigure />
              </article>
            </div>
          </section>

          <section id="tokens" className="bs-shell bs-section">
            <div className="bs-split">
              <h2 className="bs-h2 bs-col-5">Bodies that answer the request.</h2>
              <p className="bs-lede bs-col-7">
                Write tokens into a stored body and they resolve on every call, so{" "}
                <code style={{ fontSize: "0.85em" }}>GET /orders/:id</code> returns the id that was asked for.
                Change the request below and watch the response follow.
              </p>
            </div>
            <TokenPlayground />
          </section>

          <section id="app" className="bs-shell bs-section">
            <div className="bs-app-row">
              <div className="bs-col-5" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <h2 className="bs-h2">Swap one URL when the backend lands.</h2>
                <p className="bs-lede">
                  Your app calls the mock the way it will call the real API: same paths, same status codes,
                  same JSON. Keep the base URL in an environment variable and the switch is a one-line change.
                </p>
                <SnippetNotice />
              </div>
              <SnippetCard />
            </div>
          </section>

          <section id="ai" className="bs-band bs-band-yellow bs-ai">
            <div className="bs-shell bs-split" style={{ alignItems: "flex-start" }}>
              <div className="bs-col-7">
                <span className="bs-kicker">Where the AI sits</span>
                <h2 className="bs-quote">
                  No model runs when your app calls the mock. The same request returns the same bytes, every
                  time.
                </h2>
              </div>
              <div className="bs-col-5 bs-aside">
                <p style={{ marginBottom: "var(--space-3)" }}>
                  The model runs once, when you press Create. It turns your sentence into a JSON Schema and
                  writes sample records that fit it, and nothing is saved until you accept them.
                </p>
                <p>
                  After that, every call is read from the database and returned verbatim. There is no inference
                  on the request path, so no added seconds, no per-call cost, and no data shifting under the
                  interface you&apos;re building. Without a model key, Mockbird falls back to a hand-written
                  skeleton and everything else works the same.
                </p>
              </div>
            </div>
          </section>

          <section className="bs-band bs-band-teal bs-inverse">
            <div className="bs-shell bs-split" style={{ gap: "var(--space-6) var(--space-8)" }}>
              <h2 className="bs-close-h2 bs-col-5">Point your app somewhere real.</h2>
              <CloseCta />
            </div>
          </section>
        </main>

        <footer className="bs-footer bs-inverse">
          <div className="bs-shell">
            <div className="bs-footer-grid">
              <div className="bs-footer-col" style={{ gap: "var(--space-3)" }}>
                <TopLink className="bs-brand">
                  <BrandMark box={30} glyph={19} />
                  <span className="bs-brand-name">Mockbird</span>
                </TopLink>
                <span className="bs-muted" style={{ maxWidth: "24em" }}>
                  Describe an API in English, get a live mock endpoint in five seconds.
                </span>
              </div>
              <nav className="bs-footer-col" aria-label="Product">
                <span className="bs-kicker" data-ink="c">
                  Product
                </span>
                <a href="#try" className="bs-footer-link">
                  Try it
                </a>
                <a href="#states" className="bs-footer-link">
                  How it works
                </a>
                <Link href="/w" className="bs-footer-link">
                  My workspaces
                </Link>
              </nav>
              <nav className="bs-footer-col" aria-label="Docs">
                <span className="bs-kicker" data-ink="m">
                  Docs
                </span>
                <a href={`${REPO}#how-routing-works`} className="bs-footer-link">
                  How routing works
                </a>
                <a href={`${REPO}#token-substitution`} className="bs-footer-link">
                  Token substitution
                </a>
                <a href={`${REPO}#request-lifecycle`} className="bs-footer-link">
                  Request lifecycle
                </a>
                <a href={`${REPO}#limitations-stated-plainly`} className="bs-footer-link">
                  Limitations
                </a>
              </nav>
              <nav className="bs-footer-col" aria-label="Source">
                <span className="bs-kicker" data-ink="y">
                  Source
                </span>
                <a href={REPO} className="bs-footer-link">
                  <GitHubIcon size={16} />
                  GitHub
                </a>
                <a href="https://github.com/ChinmayDubey231" className="bs-footer-link">
                  Built by Chinmay Dubey
                </a>
              </nav>
            </div>
            <div className="bs-footer-base">
              <span>Mocks are public to anyone who has the workspace key. Don&apos;t put real data in them.</span>
              <span>© {new Date().getFullYear()} Mockbird</span>
            </div>
          </div>
        </footer>

        <ScrollReveal />
      </div>
    </DemoProvider>
  );
}
