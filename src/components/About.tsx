import { useTheme } from '../context/ThemeContext'

function PlaceholderAvatar({ isDark }: { isDark: boolean }) {
  return (
    <div
      role="img"
      aria-label="Photo of Nata'ani Bitselley-Romo — placeholder until headshot is added"
      className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-teal-500/30 bg-navy-800' : 'border-teal-500/20 bg-slate-100'}`}
    >
      {/* Silhouette */}
      <svg
        viewBox="0 0 100 100"
        className={`w-4/5 h-4/5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="50" cy="36" r="18" />
        <path d="M10 90 Q10 62 50 62 Q90 62 90 90Z" />
      </svg>
      {/* Teal corner accent */}
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-teal-500/20 rounded-tl-2xl" />
    </div>
  )
}

export default function About() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600'
  const headingText = isDark ? 'text-slate-100' : 'text-slate-900'
  const cardBg = isDark ? 'bg-navy-800 border-navy-800' : 'bg-white border-slate-200'
  const divider = isDark ? 'border-teal-500/20' : 'border-teal-500/30'

  return (
    <section
      id="about"
      className={`py-24 ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <p className="section-label text-center mb-2">Who I Am</p>
        <h2 className={`text-3xl sm:text-4xl font-bold text-center mb-16 ${headingText}`}>
          About Me
        </h2>

        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-16">
          {/* Photo */}
          <div className="flex-shrink-0">
            <PlaceholderAvatar isDark={isDark} />
          </div>

          {/* Bio + experience */}
          <div className="flex-1 space-y-6">
            <p className={`text-lg leading-relaxed ${mutedText}`}>
              I&apos;m <span className={`font-semibold ${headingText}`}>Nata&apos;ani Bitselley-Romo</span> — educator, developer, and builder.
              With experience that spans the classroom and the codebase, I bring a perspective most people
              don&apos;t: the patience of a teacher and the precision of an engineer.
            </p>
            <p className={`text-lg leading-relaxed ${mutedText}`}>
              I believe the best technology is technology that teaches, and the best lessons are the ones that
              build something real. My background crosses education and software development — from designing
              curriculum and supporting learners, to building embedded systems, full-stack apps, and everything
              in between.
            </p>
            <p className={`text-lg leading-relaxed ${mutedText}`}>
              I&apos;m driven by curiosity, motivated by impact, and always looking for the next problem worth
              solving.
            </p>

            <div className={`border-t pt-6 ${divider}`}>
              <p className="section-label mb-4">Background</p>
              <div className="space-y-3">
                {/* Work / education highlights — add real entries here */}
                {[
                  { label: 'Software Development', sub: 'A.A.S. Degree — Central New Mexico Community College' },
                  { label: 'Mathematics', sub: 'Currently pursuing B.S. — University of New Mexico' },
                ].map(item => (
                  <div key={item.label} className={`flex items-start gap-3 p-4 rounded-xl border ${cardBg}`}>
                    <span className="mt-1 w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className={`font-semibold ${headingText}`}>{item.label}</p>
                      <p className={`text-sm ${mutedText}`}>{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
