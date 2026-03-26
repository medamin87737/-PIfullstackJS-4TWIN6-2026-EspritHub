export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background">
      <div className="app-ambient-bg" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="loader-pulse-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-lg font-bold text-[hsl(var(--primary-foreground))] shadow-md">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-[hsl(var(--primary-foreground))]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="13 3 7 14 11 14 9 21 17 9 13 9 15 3" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">SkillUpTn</h2>
        </div>
        <div className="loader-bars" aria-hidden="true">
          <span className="bar bar-1" />
          <span className="bar bar-2" />
          <span className="bar bar-3" />
          <span className="bar bar-4" />
        </div>
        <p className="text-shimmer text-xs font-medium tracking-[0.25em]">INITIALISATION</p>
      </div>
    </div>
  )
}
