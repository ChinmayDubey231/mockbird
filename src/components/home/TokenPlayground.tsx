"use client";

import { useEffect, useMemo, useState } from "react";
import { compilePath, splitRequestPath } from "@/lib/path";
import { didYouMean, matchSegments } from "@/lib/match";
import { substitute } from "@/lib/template";
import { formatJson, highlight, type Run } from "./json";
import { JsonText } from "./JsonText";

/*
 * The token demo resolves a stored body with the same matcher, template and
 * 404 logic the mock route uses, so whatever the visitor types here is what a
 * real call to that path would return.
 */

const STORED_PATH = "/orders/:id";
const ROUTE = compilePath(STORED_PATH);
const STORED = {
  id: "{{id}}",
  page: "{{query.page}}",
  placedAt: "{{now}}",
  customer: "{{random.name}}",
  ref: "{{random.int}}",
  items: [{ pos: "{{index}}" }, { pos: "{{index}}" }],
};

const PICKS = ["/orders/ord_92kd", "/orders/ord_71bz?page=2", "/ordres/ord_92kd"];

const TOKENS: [string, string][] = [
  ["{{id}}", "The matched path param of that name"],
  ["{{query.page}}", "A query-string value, empty when absent"],
  ["{{wildcard}}", "Everything captured by a trailing *"],
  ["{{now}}", "ISO timestamp at request time"],
  ["{{index}}", "Position in the enclosing array, as a number"],
  ["{{random.name}}", "A fake name, new on every call"],
  ["{{random.int}}", "An integer from 1 to 9999, new on every call"],
];

const TOKEN = /\{\{[^}]+\}\}/g;
const RESOLVED = /("(?:id|page|placedAt|customer|ref|pos)": )("[^"]*"|-?\d+)/g;
const SUGGESTED = /("(?:didYouMean|available)": )(\[[^\]]*\]|"[^"]*")/g;

interface Draw {
  name: string;
  int: number;
  now: Date;
}

/*
 * The random tokens are drawn once per request rather than on every render,
 * through the real resolver. The first render uses fixed values so the server
 * and the browser agree; the clock is set to the real time once mounted.
 */
const FIRST_DRAW: Draw = { name: "Ananya Iyer", int: 4821, now: new Date("2026-10-01T09:41:00.000Z") };
const NO_REQUEST = { params: {}, query: {} };

function draw(): Draw {
  return {
    name: String(substitute("{{random.name}}", NO_REQUEST)),
    int: Number(substitute("{{random.int}}", NO_REQUEST)),
    now: new Date(),
  };
}

function withDraw(value: unknown, d: Draw): unknown {
  if (value === "{{random.name}}") return d.name;
  if (value === "{{random.int}}") return d.int;
  if (Array.isArray(value)) return value.map((v) => withDraw(v, d));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withDraw(v, d)]));
  }
  return value;
}

function Code({ lines, chip }: { lines: Run[][]; chip: string }) {
  return (
    <div className="bs-code">
      {lines.map((runs, i) => (
        <div key={i} className="bs-line">
          <JsonText runs={runs} chip={chip} />
        </div>
      ))}
    </div>
  );
}

const storedLines = formatJson(STORED)
  .split("\n")
  .map((line) => highlight(line, TOKEN));

export function TokenPlayground() {
  const [request, setRequest] = useState(PICKS[1]);
  const [current, setCurrent] = useState(FIRST_DRAW);

  useEffect(() => setCurrent((d) => ({ ...d, now: new Date() })), []);

  const ask = (value: string) => {
    setRequest(value);
    setCurrent(draw());
  };

  const response = useMemo(() => {
    const raw = request.startsWith("/") ? request : `/${request}`;
    const q = raw.indexOf("?");
    const path = q < 0 ? raw : raw.slice(0, q);
    const query: Record<string, string> = {};
    new URLSearchParams(q < 0 ? "" : raw.slice(q + 1)).forEach((v, k) => {
      query[k] = v;
    });

    const hit = matchSegments(ROUTE.segments, splitRequestPath(path));
    if (hit) {
      const body = substitute(withDraw(STORED, current), {
        params: hit.params,
        query,
        wildcard: hit.wildcard,
        now: current.now,
      });
      return { ok: true, lines: formatJson(body).split("\n").map((l) => highlight(l, RESOLVED)) };
    }

    // The same body the mock route sends when nothing matches.
    const suggestion = didYouMean(path, [STORED_PATH]);
    const body: Record<string, unknown> = {
      error: "No endpoint matched",
      requested: `GET ${path}`,
      available: [`GET ${STORED_PATH}`],
    };
    if (suggestion && suggestion !== path) {
      body.didYouMean = suggestion;
      body.hint = `You called ${path}. Did you mean ${suggestion}?`;
    }
    return { ok: false, lines: formatJson(body).split("\n").map((l) => highlight(l, SUGGESTED)) };
  }, [request, current]);

  return (
    <>
      <div className="bs-request">
        <span className="bs-kicker">Request</span>
        <div className="bs-request-field">
          <span className="bs-method" data-method="GET">
            GET
          </span>
          <input
            className="bs-input"
            value={request}
            onChange={(e) => ask(e.target.value)}
            aria-label="Request path"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="bs-row" style={{ gap: "var(--space-1)" }}>
          {PICKS.map((pick) => (
            <button key={pick} type="button" className="bs-btn bs-btn-ghost bs-btn-pick" onClick={() => ask(pick)}>
              {pick}
            </button>
          ))}
        </div>
      </div>

      <div className="bs-token-grid">
        <figure>
          <div className="bs-kicker">
            Stored body{" "}
            {/* Paths are case-sensitive, so this one keeps its real case. */}
            <span className="bs-muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              · {STORED_PATH}
            </span>
          </div>
          <Code lines={storedLines} chip="bs-chip-y" />
        </figure>
        <figure>
          <div className="bs-kicker">
            Response{" "}
            <span style={{ fontWeight: 400, color: response.ok ? "var(--color-ok-700)" : "var(--color-accent-2-700)" }}>
              · {response.ok ? "200 OK" : "404 Not Found"}
            </span>
          </div>
          <Code lines={response.lines} chip={response.ok ? "bs-chip-c" : "bs-chip-m"} />
        </figure>
        <div>
          <div className="bs-kicker">Tokens</div>
          <table className="bs-table">
            <tbody>
              {TOKENS.map(([token, meaning]) => (
                <tr key={token}>
                  <td>
                    <code className="bs-chip-y" style={{ fontSize: 13, padding: "1px 4px" }}>
                      {token}
                    </code>
                  </td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="bs-muted" style={{ marginTop: "var(--space-3)", fontSize: 14 }}>
            Only the two random tokens break the same-bytes guarantee.
          </p>
        </div>
      </div>
    </>
  );
}
