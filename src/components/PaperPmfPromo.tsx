const PAPERPMF_URL =
  'https://paperpmf.com/?utm_source=repo2txt&utm_medium=referral&utm_campaign=paperpmf_crosspromo_2026&utm_content=context_strip#diagnostic-intake';

export function PaperPmfPromo() {
  return (
    <aside
      aria-label="PaperPMF announcement"
      className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700"
    >
      <a
        href={PAPERPMF_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="From code context to market context—explore synthetic purchase intent with PaperPMF. Run free diagnostic (opens in a new tab)"
        className="group block min-h-[44px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <span className="container mx-auto grid min-h-[44px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:flex sm:flex-nowrap sm:justify-center sm:gap-3 sm:px-4 sm:py-2 lg:px-6">
          <span className="inline-flex rounded-full border border-white/40 bg-white/10 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-white">
            NEXT CONTEXT
          </span>
          <span className="text-sm font-medium leading-snug text-white sm:text-base">
            From code context to market context—explore synthetic purchase intent with PaperPMF.
          </span>
          <span className="col-span-2 inline-flex min-h-[44px] items-center justify-center justify-self-center rounded-md border border-white/50 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors group-hover:border-white/80 group-hover:bg-white/20 motion-reduce:transition-none sm:col-span-1 sm:min-h-9 sm:flex-shrink-0 sm:py-1.5">
            Run free diagnostic →
          </span>
        </span>
      </a>
    </aside>
  );
}
