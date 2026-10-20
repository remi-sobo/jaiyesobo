import type { Block } from "@/lib/content/types";
import { HandNote } from "./type";

/** Jaiye's article prose: paragraphs, the boxed pull block, and margin notes. Shared by columns and episodes. */
export default function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-[26px]">
      {blocks.map((block, i) => {
        if (block.kind === "p") {
          return (
            <p key={i} className="text-[1.1rem] leading-[1.75] text-pretty">
              {block.text}
            </p>
          );
        }
        if (block.kind === "pull") {
          return (
            <div
              key={i}
              className="flex flex-col gap-1.5 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-[clamp(20px,3vw,32px)] py-7 font-[family-name:var(--font-fraunces)] text-[clamp(1.3rem,3vw,1.8rem)] font-black leading-[1.25] tracking-[-0.02em]"
            >
              {block.lines.map((line, j) => (
                <span key={j} className={block.accentLast && j === block.lines.length - 1 ? "text-[var(--color-red)]" : undefined}>
                  {line}
                </span>
              ))}
            </div>
          );
        }
        return (
          <HandNote key={i} align="right" className="max-w-[26ch]">
            {block.text}
          </HandNote>
        );
      })}
    </div>
  );
}
