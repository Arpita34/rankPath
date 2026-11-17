import { Fragment, type ReactNode } from "react";

// Minimal renderer for the agent's replies: paragraphs, "- " / "1. " lists and **bold**.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="my-1.5 list-disc space-y-1 pl-5">
          {list.map((l, i) => <li key={i}>{inline(l)}</li>)}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const m = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) { list.push(m[1]); continue; }
    flush();
    if (!line) continue;
    blocks.push(<p key={blocks.length} className="my-1.5">{inline(line.replace(/^#+\s*/, ""))}</p>);
  }
  flush();
  return <>{blocks}</>;
}
