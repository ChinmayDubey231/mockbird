"use client";

import { useState } from "react";
import { SAMPLE_KEY, useDemo } from "./DemoContext";
import { useCopy } from "./useCopy";
import { CheckCircleIcon, CheckIcon, CopyIcon } from "./Icons";

type Tab = "fetch" | "curl";

const TABS: { id: Tab; label: string }[] = [
  { id: "fetch", label: "fetch" },
  { id: "curl", label: "curl" },
];

const COMMENT = /^\s*(\/\/|#)/;
const SYNTAX = /(`[^`]*`|"[^"]*")|\b(const|await|if|throw|new)\b|^(\$)/g;

/** Splits a code line into runs for colouring: strings, keywords and a shell prompt. */
function syntax(line: string): { text: string; className?: string }[] {
  const parts: { text: string; className?: string }[] = [];
  let last = 0;
  for (const m of line.matchAll(SYNTAX)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: line.slice(last, at) });
    parts.push({ text: m[0], className: m[1] ? "bs-s-str" : m[2] ? "bs-s-kw" : "bs-s-prompt" });
    last = at + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}

/** A one-letter transposition, the typo the 404's didYouMean exists to catch. */
function misspell(path: string): string {
  const noun = path.slice(1);
  const swapped = noun.length >= 5 ? noun.slice(0, 3) + noun[4] + noun[3] + noun.slice(5) : `${noun}x`;
  return swapped === noun ? `/${noun}x` : `/${swapped}`;
}

function snippet(tab: Tab, base: string, path: string): string[] {
  const noun = path.slice(1);
  if (tab === "fetch") {
    return [
      "// .env.local",
      `NEXT_PUBLIC_API_URL=${base}`,
      "",
      `// app/${noun}/page.tsx`,
      `const res = await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}${path}\`);`,
      "if (!res.ok) throw new Error(`Request failed: ${res.status}`);",
      `const ${noun} = await res.json();`,
    ];
  }
  return [
    "# your endpoint",
    `$ curl -s ${base}${path}`,
    "",
    "# mistype it and the 404 says what exists",
    `$ curl -s ${base}${misspell(path)}`,
    `{ "didYouMean": "${path}", … }`,
  ];
}

/** The "swap one URL" snippet, pointed at the visitor's own endpoint once there is one. */
export function SnippetCard() {
  const { origin, endpoint } = useDemo();
  const [tab, setTab] = useState<Tab>("fetch");
  const [copied, copy] = useCopy();
  const lines = snippet(tab, `${origin}/m/${endpoint?.key ?? SAMPLE_KEY}`, endpoint?.path ?? "/orders");

  return (
    <div className="bs-card bs-snippet bs-inverse bs-col-7 bs-col-wide">
      <div className="bs-snippet-head">
        <div className="bs-seg" role="radiogroup" aria-label="Snippet language">
          {TABS.map((t) => (
            <label key={t.id} className="bs-seg-opt" data-checked={tab === t.id}>
              <input type="radio" name="snippet" checked={tab === t.id} onChange={() => setTab(t.id)} />
              {t.label}
            </label>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" onClick={() => copy(lines.join("\n"))}>
          {copied === "done" ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          {copied === "done" ? "Copied" : copied === "error" ? "Couldn't copy" : "Copy"}
        </button>
      </div>
      <div className="bs-snippet-body" tabIndex={0} aria-label="Code snippet">
        {lines.map((line, i) => (
          <div key={i} className="bs-line">
            {COMMENT.test(line) ? (
              <span className="bs-s-comment">{line}</span>
            ) : (
              syntax(line).map((part, j) => (
                <span key={j} className={part.className}>
                  {part.text}
                </span>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SnippetNotice() {
  const { endpoint } = useDemo();
  if (!endpoint) return null;
  return (
    <p className="bs-notice">
      <CheckCircleIcon size={18} />
      This snippet now points at the endpoint you created above.
    </p>
  );
}
