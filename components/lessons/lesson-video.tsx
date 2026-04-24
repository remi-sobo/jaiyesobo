"use client";

type Props = {
  title: string;
  description: string;
  youtubeUrl: string;
};

export default function LessonVideo({ title, description, youtubeUrl }: Props) {
  const videoId = extractYoutubeId(youtubeUrl);
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded overflow-hidden">
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-video bg-gradient-to-br from-[var(--color-warm-surface-3)] to-[var(--color-warm-surface)] group"
        style={
          thumb
            ? { backgroundImage: `url(${thumb})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,14,12,0.7)] via-transparent to-[rgba(15,14,12,0.3)] group-hover:from-[rgba(15,14,12,0.85)] transition-colors" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-[var(--color-red)] flex items-center justify-center shadow-[0_0_0_8px_rgba(230,57,70,0.18)] group-hover:scale-110 group-hover:bg-[var(--color-red-soft)] transition-transform transition-colors">
          <span className="block w-0 h-0 border-l-[16px] border-l-[var(--color-bone)] border-y-[10px] border-y-transparent ml-1" />
        </div>
        <div className="absolute top-3 left-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-bone)] bg-[rgba(15,14,12,0.8)] backdrop-blur-sm px-2 py-1 rounded">
          Opens in YouTube
        </div>
      </a>
      <div className="p-5">
        <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-lg leading-snug tracking-[-0.01em] mb-1.5">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed mb-3">{description}</p>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-red)] break-all hover:text-[var(--color-red-soft)] transition-colors"
        >
          {youtubeUrl.replace("https://", "")}
        </a>
      </div>
    </div>
  );
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/)([A-Za-z0-9_-]{11})(?:\W|$)/);
  return m ? m[1] : null;
}
