type Props = { connected: boolean; error?: string | null };

export default function ConnectDrive({ connected, error }: Props) {
  if (connected) {
    return (
      <div className="p-5 rounded border border-[var(--color-green-deep)] bg-[rgba(74,222,128,0.06)] flex items-center gap-4">
        <span className="w-8 h-8 rounded-full bg-[var(--color-green)] flex items-center justify-center shrink-0">
          <span className="block w-[10px] h-[6px] border-l-[1.5px] border-b-[1.5px] border-[var(--color-warm-bg)] -translate-y-[1px] -rotate-45" />
        </span>
        <div>
          <div className="font-[family-name:var(--font-fraunces)] font-semibold">
            Connected to <span className="italic font-normal text-[var(--color-green)]">Google Drive.</span>
          </div>
          <div className="text-sm text-[var(--color-warm-mute)] mt-0.5">
            Jaiye&apos;s uploads land in your configured folder. To reconnect (new scopes, new account), revoke in Google
            Account settings, then click below again.
          </div>
        </div>
        <a
          href="/api/auth/google/start"
          className="ml-auto font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors whitespace-nowrap"
        >
          Reconnect
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 rounded border border-[var(--color-amber)] bg-[rgba(244,162,97,0.06)] flex items-center gap-5">
      <div className="w-10 h-10 rounded-full bg-[var(--color-amber)] flex items-center justify-center text-[var(--color-warm-bg)] shrink-0">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="8" cy="8" r="6.5" />
          <line x1="8" y1="5" x2="8" y2="9" />
          <line x1="8" y1="11" x2="8" y2="11.01" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="font-[family-name:var(--font-fraunces)] font-semibold text-lg">
          Connect <span className="italic font-normal text-[var(--color-amber)]">Google Drive.</span>
        </div>
        <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed mt-1 max-w-[60ch]">
          Upload flow won&apos;t work until Drive is linked. One-time authorization: creates/uses only the folders this app needs.
        </p>
        {error && (
          <p className="text-sm text-[var(--color-red-soft)] italic mt-2">
            Last attempt failed ({error}). Try again.
          </p>
        )}
      </div>
      <a
        href="/api/auth/google/start"
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors whitespace-nowrap"
      >
        Connect Drive
      </a>
    </div>
  );
}
