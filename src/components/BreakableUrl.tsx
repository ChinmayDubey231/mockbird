import { Fragment } from "react";

/**
 * Renders a URL/path with a <wbr> after every "/", so a long one wraps at a
 * segment boundary ("…/m/a8f3k2/⏎orders") instead of splitting mid-word
 * ("…/m/a8f3k2/or⏎ders") — which is what plain overflow-wrap: anywhere does
 * once nothing else fits. overflow-wrap: anywhere is still worth keeping
 * alongside this as a last-resort fallback, for the rare single segment
 * that's itself wider than the container.
 */
export function BreakableUrl({ value }: { value: string }) {
  const segments = value.split(/(?<=\/)/);
  return (
    <>
      {segments.map((segment, i) => (
        <Fragment key={i}>
          {segment}
          {i < segments.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  );
}
