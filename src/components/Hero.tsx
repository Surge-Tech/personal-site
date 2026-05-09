import { useTheme } from '../context/ThemeContext'

export default function Hero() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section
      id="hero"
      className={`relative min-h-screen flex items-center justify-center overflow-hidden ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}
    >
      {/* Animated grid background — hidden when prefers-reduced-motion */}
      <div className="absolute inset-0 motion-safe:block motion-reduce:hidden" aria-hidden="true">
        <div
          className={`absolute inset-0 ${isDark ? 'opacity-20' : 'opacity-10'}`}
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(rgba(20, 184, 166, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.15) 1px, transparent 1px)'
              : 'linear-gradient(rgba(13, 148, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glowing orb */}
        <div
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse-slow ${isDark ? 'bg-teal-500/10' : 'bg-teal-400/10'}`}
        />
      </div>

      {/* Static fallback gradient (always visible, overlaid by animated layer) */}
      <div
        className={`absolute inset-0 motion-reduce:opacity-100 motion-safe:opacity-0 ${isDark ? 'bg-gradient-to-br from-navy-950 via-navy-950 to-teal-500/5' : 'bg-gradient-to-br from-slate-50 via-slate-50 to-teal-500/5'}`}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className={`section-label mb-4 animate-fade-in`} style={{ animationDelay: '0.1s', opacity: 0 }}>
          Hey, I&apos;m
        </p>

        <h1
          className={`text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight mb-4 animate-fade-in-up ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          Nata&apos;ani{' '}
          <span className="text-teal-500">Bitselley-Romo</span>
        </h1>

        <div
          className="flex justify-center mb-6 animate-fade-in"
          style={{ animationDelay: '0.35s', opacity: 0 }}
        >
          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${isDark ? 'border-teal-500/40 text-teal-400 bg-teal-500/10' : 'border-teal-600/40 text-teal-700 bg-teal-50'}`}>
            Mr. B
          </span>
        </div>

        <p
          className={`text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-in-up ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          style={{ animationDelay: '0.45s', opacity: 0 }}
        >
          Educator + Technologist &mdash; building bridges between the classroom and the codebase.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in"
          style={{ animationDelay: '0.6s', opacity: 0 }}
        >
          <a
            href="#projects"
            className="px-8 py-3 rounded-lg font-semibold bg-teal-500 text-white hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/25"
          >
            View My Work
          </a>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={`px-8 py-3 rounded-lg font-semibold border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:border-teal-500 hover:text-teal-400' : 'border-slate-300 text-slate-600 hover:border-teal-500 hover:text-teal-600'}`}
          >
            Download Resume
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 motion-safe:animate-bounce" aria-hidden="true">
        <span className={`text-xs tracking-widest uppercase ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Scroll</span>
        <svg className={`h-4 w-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
