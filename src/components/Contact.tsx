import { useForm, ValidationError } from '@formspree/react'
import { useTheme } from '../context/ThemeContext'

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-12 w-12 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function Contact() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [state, handleSubmit] = useForm('xbdwkzjo')

  const inputBase = `w-full rounded-lg px-4 py-3 text-sm transition-colors outline-none focus:ring-2 focus:ring-teal-500 ${
    isDark
      ? 'bg-navy-950 border border-navy-800 text-slate-100 placeholder-slate-500 focus:border-teal-500'
      : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-500'
  }`

  const labelBase = `block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`
  const mutedText = isDark ? 'text-slate-500' : 'text-slate-400'
  const cardBg = isDark ? 'bg-navy-800 border-navy-800' : 'bg-white border-slate-200 shadow-sm'

  return (
    <section
      id="contact"
      className={`py-24 ${isDark ? 'bg-navy-900' : 'bg-slate-100'}`}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <p className="section-label text-center mb-2">Get In Touch</p>
        <h2 className={`text-3xl sm:text-4xl font-bold text-center mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Contact
        </h2>
        <p className={`text-center mb-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Have a question or opportunity? I&apos;d love to hear from you.
        </p>

        <div className={`rounded-2xl border p-8 ${cardBg}`}>
          {state.succeeded ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <CheckIcon />
              <h3 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Message sent!
              </h3>
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Thanks for reaching out — I&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Honeypot — Formspree spam protection */}
              <input type="text" name="_gotcha" className="hidden" aria-hidden="true" tabIndex={-1} />

              <div className="space-y-5">
                <div>
                  <label htmlFor="contact-name" className={labelBase}>Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    className={inputBase}
                    placeholder="Your name"
                  />
                  <ValidationError field="name" errors={state.errors} className="text-xs text-red-400 mt-1" />
                </div>

                <div>
                  <label htmlFor="contact-email" className={labelBase}>Email</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={inputBase}
                    placeholder="you@example.com"
                  />
                  <ValidationError field="email" errors={state.errors} className="text-xs text-red-400 mt-1" />
                </div>

                <div>
                  <label htmlFor="contact-message" className={labelBase}>Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={5}
                    className={`${inputBase} resize-none`}
                    placeholder="What's on your mind?"
                  />
                  <ValidationError field="message" errors={state.errors} className="text-xs text-red-400 mt-1" />
                </div>

                {!state.succeeded && state.errors && Object.keys(state.errors).length > 0 && (
                  <p
                    className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3"
                    role="alert"
                    aria-live="polite"
                  >
                    Something went wrong. Please try again or reach out directly on GitHub.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state.submitting}
                  className="w-full py-3 px-6 rounded-lg font-semibold bg-teal-500 text-white hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {state.submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending&hellip;
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className={`text-center text-xs mt-4 ${mutedText}`}>
          Your message is sent via Formspree and is not stored on this site.
        </p>

        <div className="flex justify-center mt-8">
          <a
            href="https://github.com/Surge-Tech"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Surge-Tech on GitHub"
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-teal-400' : 'text-slate-500 hover:text-teal-600'}`}
          >
            <GitHubIcon />
            github.com/Surge-Tech
          </a>
        </div>
      </div>
    </section>
  )
}
