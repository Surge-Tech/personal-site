import { useTheme } from '../context/ThemeContext'

interface Project {
  title: string
  repo?: string
  demoUrl?: string
  status?: 'in-progress'
  description: string
  tags: string[]
}

const PROJECTS: Project[] = [
  {
    title: 'Jeopardy',
    repo: 'Surge-Tech/jeopardy',
    description:
      'A self-hosted Jeopardy platform — build custom boards with text, image, and video clues, then host game nights in person or online. Players buzz in from any phone browser (no install), and a real-time Socket.io backend ensures the first buzz always wins.',
    tags: ['Node.js', 'React', 'TypeScript', 'Socket.io', 'Tailwind CSS'],
  },
  {
    title: 'Piano Waveform Visualizer',
    demoUrl: '/fourier-tool/',
    description:
      'An interactive Fourier superposition tool — play pure sine tones on a virtual piano and watch the combined waveform build in real time. Built as a companion visual for a signal-processing research paper.',
    tags: ['JavaScript', 'Web Audio API', 'Fourier Analysis', 'Interactive'],
  },
  {
    title: 'Unit Converter',
    demoUrl: '/unit-converter/',
    description:
      'A fast, reversible converter across ten categories — temperature, length, mass, volume, and more. Type into either side and it converts both ways instantly.',
    tags: ['JavaScript', 'Interactive', 'Utility'],
  },
  {
    title: 'BoozyDB',
    repo: 'Surge-Tech/boozy-db',
    status: 'in-progress',
    description:
      'A tablet-first cocktail recipe catalog — a curated collection of classic and modern recipes with glass illustrations, ingredient lists, and step-by-step instructions, backed by a CLI for managing the recipe data. Static-site deployment is planned but not live yet.',
    tags: ['Python', 'Flask', 'CLI', 'Recipe Catalog'],
  },
]

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function TagPill({ tag, isDark }: { tag: string; isDark: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isDark
          ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
          : 'bg-teal-50 text-teal-700 border border-teal-200'
      }`}
    >
      {tag}
    </span>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <article
      className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 group ${
        project.status === 'in-progress'
          ? isDark
            ? 'bg-navy-800 border-navy-800 border-dashed'
            : 'bg-white border-slate-200 border-dashed'
          : isDark
            ? 'bg-navy-800 border-navy-800 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5'
            : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-lg shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className={`text-lg font-bold leading-snug ${isDark ? 'text-slate-100 group-hover:text-teal-400' : 'text-slate-900 group-hover:text-teal-600'} transition-colors`}>
          {project.title}
        </h3>
        {project.status !== 'in-progress' && (
          <svg
            className={`h-6 w-6 flex-shrink-0 mt-0.5 transition-colors ${isDark ? 'text-slate-600' : 'text-slate-300'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6m0 0V3m0 4L3 3M21 17h-6m0 0v4m0-4l6 4" />
          </svg>
        )}
      </div>

      <p className={`text-sm leading-relaxed flex-1 mb-5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {project.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {project.tags.map(tag => (
          <TagPill key={tag} tag={tag} isDark={isDark} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {project.status === 'in-progress' && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isDark
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            In progress — not live yet
          </span>
        )}

        {project.demoUrl && (
          <a
            href={project.demoUrl}
            aria-label={`Open live demo of ${project.title}`}
            className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
              isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            Try it live
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M2.5 9.5l7-7M9.5 2.5H3M9.5 2.5v6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}

        {project.repo && (
          <a
            href={`https://github.com/${project.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${project.title} on GitHub`}
            className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
              isDark ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            }`}
          >
            <GitHubIcon />
            {project.demoUrl ? 'Source' : 'View on GitHub'}
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M2.5 9.5l7-7M9.5 2.5H3M9.5 2.5v6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
    </article>
  )
}

export default function Projects() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section
      id="projects"
      className={`py-24 ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="section-label text-center mb-2">What I&apos;ve Built</p>
        <h2 className={`text-3xl sm:text-4xl font-bold text-center mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Projects
        </h2>
        <p className={`text-center mb-16 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          A selection of things I&apos;ve made across hardware, software, and the web.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {PROJECTS.map(project => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>

        <div className="text-center">
          <a
            href="https://github.com/Surge-Tech"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'}`}
          >
            <GitHubIcon />
            See all projects on GitHub
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M2.5 9.5l7-7M9.5 2.5H3M9.5 2.5v6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
