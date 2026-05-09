import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
]

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12H3m15.07-6.07-.71.71M6.64 17.36l-.71.71M17.36 17.36l.71.71M6.64 6.64l.71.71M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on Escape and restore focus
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        hamburgerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // Focus trap inside mobile menu
  useEffect(() => {
    if (!menuOpen || !menuRef.current) return
    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length) focusable[0].focus()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [menuOpen])

  // Prevent scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const isDark = theme === 'dark'
  const navBg = scrolled
    ? isDark
      ? 'bg-navy-950/95 backdrop-blur border-b border-navy-800 shadow-lg shadow-black/20'
      : 'bg-white/95 backdrop-blur border-b border-slate-200 shadow-lg shadow-slate-200/50'
    : 'bg-transparent'

  const textColor = isDark ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
  const logoColor = isDark ? 'text-slate-100' : 'text-slate-900'

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo — links back to hero */}
            <a
              href="#hero"
              className={`font-bold text-xl tracking-tight transition-colors ${logoColor} hover:text-teal-500`}
              aria-label="Nata'ani Bitselley-Romo — back to top"
            >
              Mr.<span className="text-teal-500">B</span>
            </a>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${textColor}`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggle}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-teal-400 hover:bg-navy-800' : 'text-slate-500 hover:text-teal-600 hover:bg-slate-100'}`}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white transition-colors"
              >
                Resume
              </a>
            </div>

            {/* Mobile: theme + hamburger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggle}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-teal-400' : 'text-slate-500 hover:text-teal-600'}`}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                ref={hamburgerRef}
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'}`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col md:hidden"
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            ref={menuRef}
            className={`relative ml-auto h-full w-72 flex flex-col pt-6 pb-8 px-6 ${isDark ? 'bg-navy-950' : 'bg-white'}`}
          >
            <div className="flex items-center justify-between mb-10">
              <span className={`font-bold text-xl ${logoColor}`}>
                Mr.<span className="text-teal-500">B</span>
              </span>
              <button
                onClick={closeMenu}
                aria-label="Close navigation menu"
                className={`p-2 rounded-lg ${isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1">
              {NAV_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`py-3 px-4 rounded-lg text-base font-medium transition-colors ${isDark ? 'text-slate-300 hover:text-teal-400 hover:bg-navy-800' : 'text-slate-700 hover:text-teal-600 hover:bg-slate-100'}`}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="mt-6 py-3 text-center text-sm font-semibold rounded-lg border border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white transition-colors"
            >
              Download Resume
            </a>
          </div>
        </div>
      )}
    </>
  )
}
