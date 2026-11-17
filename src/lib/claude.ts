import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic(); // reads ANTHROPIC_API_KEY
export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

// Server-side refusal fallback (beta): if a request is declined, the API re-runs it on
// a fallback model chosen by refusal category, inside the same call.
export const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

export function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
