export default function LandingPage() {
  const pipelineLetters = Array.from('PIPELINE');
  const conversionsLetters = Array.from('REVENUE');

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0b1020] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-10%,#6d28d9_0%,#4c1d95_35%,#1e3a8a_65%,#0b1020_100%)]" />
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="absolute -top-24 -left-32 h-[520px] w-[520px] rounded-full bg-purple-600/40 blur-[120px]" />
      <div className="absolute -bottom-40 -right-32 h-[620px] w-[620px] rounded-full bg-blue-600/40 blur-[140px]" />

      <nav className="mx-auto flex w-full items-center justify-between px-10 pt-6">
        <div className="flex items-center gap-0">
          <img
            src="/icon-512.png"
            alt="ikaLeads"
            className="h-16 w-16 rounded-full"
          />
          <span className="ml-[-6px] text-[2.75rem] font-bold tracking-tight">ikaLeads</span>
        </div>
        <div className="hidden items-center rounded-full border border-white/10 bg-white/10 px-2 py-1.5 backdrop-blur-md shadow-lg md:flex">
          <div className="mx-1 h-4 w-px bg-white/20" />
          <a
            className="ml-2 rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-600"
            href="/shop"
          >
            Go to Platform
          </a>
        </div>
        <button className="text-white md:hidden">
          <span className="text-3xl">≡</span>
        </button>
      </nav>

      <main className="mx-auto flex w-full flex-1 flex-col items-center px-10 pb-0 pt-16">
        <div className="w-full max-w-7xl">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="relative">
              <h1 className="font-geliat pointer-events-none absolute -left-4 -top-12 select-none text-6xl tracking-tight text-white/10 md:-left-8 md:-top-16 md:text-8xl">
                GENERATE
              </h1>
              <h2 className="font-geliat relative z-10 text-5xl leading-tight md:text-7xl">
                CONNECT
                <br />
                <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                  CONVERT
                </span>
              </h2>
            </div>
            <p className="max-w-xl text-xl font-medium leading-relaxed text-blue-100/90 md:text-2xl">
              A dedicated platform for <span className="font-semibold text-white">lead generation</span> and
              <span className="font-semibold text-white"> business growth</span>. We supply
              <span className="font-semibold text-white"> consistent lead bundles</span> to help you keep your
              <span className="font-semibold text-white"> sales pipeline full</span> without the hassle of manual sourcing.
              Pick your bundle, <span className="font-semibold text-white">access the data instantly</span>, and start
              connecting with <span className="font-semibold text-white">new prospects</span> right away.
            </p>
          </div>

          <div className="relative hidden flex-col items-end space-y-4 text-right lg:flex">
            <h3 className="font-geliat select-none text-6xl tracking-tight text-white/15 md:text-8xl">
              {pipelineLetters.map((letter, index) => (
                <span
                  key={`p-${index}`}
                  className="relative inline-block px-0.5 transition-all duration-200 hover:text-white/90 hover:drop-shadow-[0_0_18px_rgba(147,197,253,0.7)] hover:brightness-125"
                >
                  <span className="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-2xl transition-opacity duration-200 hover:opacity-100" />
                  {letter}
                </span>
              ))}
            </h3>
            <div className="flex items-center justify-end gap-4">
              <div className="flex h-28 w-28 items-center justify-center">
                <video
                  src="/output.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-28 w-28 object-contain"
                />
              </div>
              <h4 className="font-geliat text-6xl tracking-[0.2em]">LEADS</h4>
            </div>
            <h3 className="font-geliat select-none text-6xl tracking-tight text-white/15 md:text-8xl">
              {conversionsLetters.map((letter, index) => (
                <span
                  key={`c-${index}`}
                  className="relative inline-block px-0.5 transition-all duration-200 hover:text-white/90 hover:drop-shadow-[0_0_18px_rgba(147,197,253,0.7)] hover:brightness-125"
                >
                  <span className="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-2xl transition-opacity duration-200 hover:opacity-100" />
                  {letter}
                </span>
              ))}
            </h3>
            <div className="mt-8 flex items-center gap-4">
              <a className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-slate-900 shadow-lg hover:bg-gray-100" href="#">
                Developer Hub
              </a>
              <a className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-6 py-3 font-bold text-white shadow-lg hover:bg-slate-900" href="#">
                <span className="text-lg"></span>
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 w-full overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_25px_80px_rgba(60,80,220,0.25)] backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="group relative border-b border-[#cfd9ff] bg-[#f5f7ff] p-8 transition-colors duration-300 hover:bg-white md:border-b-0 md:border-r">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <span className="text-2xl">🏆</span>
                </div>
                <span className="font-geliat flex items-center gap-1 rounded bg-yellow-400 px-2.5 py-1.5 text-xs uppercase text-slate-900">
                  Showcase <span>→</span>
                </span>
              </div>
              <h3 className="font-geliat mb-3 text-xl uppercase tracking-wider text-indigo-900">Lead Injection</h3>
              <p className="text-base font-semibold leading-relaxed text-slate-700">
                Lead bundles delivered instantly to your dashboard. Browse the marketplace, pick your bundle, and get the data you need to start your outreach on day one.
              </p>
            </div>
            <div className="group relative border-b border-[#cfd9ff] bg-[#f0f4ff] p-8 transition-colors duration-300 hover:bg-white md:border-b-0 md:border-r">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <span className="text-2xl">👁️</span>
                </div>
                <span className="font-geliat rounded bg-slate-800 px-2.5 py-1.5 text-xs uppercase text-white">Showcase</span>
              </div>
              <h3 className="font-geliat mb-3 text-xl uppercase tracking-wider text-indigo-900">Smart Routing</h3>
              <p className="text-base font-semibold leading-relaxed text-slate-700">
                Distribute leads to your team with rules, tags, and follow‑up windows. Keep every rep focused on the highest‑value prospects.
              </p>
            </div>
            <div className="group relative bg-[#eef2ff] p-8 transition-colors duration-300 hover:bg-white">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <span className="text-2xl">📊</span>
                </div>
                <span className="font-geliat rounded bg-blue-200 px-2.5 py-1.5 text-xs uppercase text-blue-800">Coming Soon</span>
              </div>
              <h3 className="font-geliat mb-3 text-xl uppercase tracking-wider text-indigo-900">Real-time Stats</h3>
              <p className="text-base font-semibold leading-relaxed text-slate-700">
                Track conversions, revenue, and pipeline velocity in real time. Know what’s working and double down on the right channels.
              </p>
            </div>
          </div>
        </div>
        </div>

      </main>

      <footer className="fixed bottom-0 left-0 z-10 w-full bg-transparent">
        <div className="mx-auto flex w-full flex-col items-center justify-between gap-4 px-10 py-4 text-sm text-white/70 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">ikaLeads</span>
            <span className="text-white/50">•</span>
            <span>Lead marketplace</span>
          </div>
          <div className="flex items-center gap-6">
            <a className="hover:text-white" href="/shop">Platform</a>
            <a className="hover:text-white" href="#">Support</a>
            <a className="hover:text-white" href="/privacy">Privacy</a>
          </div>
          <div className="text-white/50">© 2026 ikaLeads. All rights reserved.</div>
        </div>
      </footer>

      {/* removed fixed bottom fade to avoid extra scroll space */}
    </div>
  );
}
