import { jsonTokens, type Kind, type Run } from "./json";

const KIND_CLASS: Record<Kind, string | undefined> = {
  key: "bs-j-key",
  string: "bs-j-str",
  number: "bs-j-num",
  literal: "bs-j-lit",
  punct: "bs-j-punct",
  plain: undefined,
};

/** One line of formatted JSON, syntax-coloured, with any marked runs drawn as chips. */
export function JsonText({ runs, chip }: { runs: Run[]; chip?: string }) {
  return (
    <>
      {runs.map((run, i) =>
        run.marked ? (
          <span key={i} className={chip}>
            {run.text}
          </span>
        ) : (
          jsonTokens(run.text).map((token, j) => (
            <span key={`${i}.${j}`} className={KIND_CLASS[token.kind]}>
              {token.text}
            </span>
          ))
        )
      )}
    </>
  );
}
