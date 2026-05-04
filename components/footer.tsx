export default function Footer() {
  return (
    <footer className="px-6 lg:px-10 pt-16 pb-8 border-t border-[var(--color-line)]">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight">
          Ballin&apos;
          <br />
          <span className="text-[var(--color-red)] italic font-normal">+ Buildin&apos;.</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)] pt-8 border-t border-[var(--color-line)]">
        <div>© 2026 Jaiye Sobo · East Palo Alto</div>
        <div>Built by Jaiye + Dad · 2026</div>
      </div>
    </footer>
  );
}
