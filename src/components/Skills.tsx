import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

interface Skill {
  name: string
  value: number
}

interface SkillGroup {
  category: string
  skills: Skill[]
}

const SKILL_GROUPS: SkillGroup[] = [
  {
    category: 'Languages & Markup',
    skills: [
      { name: 'HTML & CSS', value: 85 },
      { name: 'Python', value: 80 },
      { name: 'TypeScript / JavaScript', value: 75 },
      { name: 'C++', value: 65 },
    ],
  },
  {
    category: 'Tools & Frameworks',
    skills: [
      { name: 'Git & GitHub', value: 85 },
      { name: 'Arduino / Embedded C++', value: 70 },
      { name: 'React', value: 45 },
    ],
  },
  {
    category: 'Education & Soft Skills',
    skills: [
      { name: 'Technical Communication', value: 90 },
      { name: 'Problem Solving', value: 90 },
      { name: 'Curriculum Design', value: 85 },
      { name: 'Mentorship & Coaching', value: 85 },
    ],
  },
]

function SkillBar({ skill, animate }: { skill: Skill; animate: boolean }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {skill.name}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
          {skill.value}%
        </span>
      </div>
      <div
        className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-navy-800' : 'bg-slate-200'}`}
        role="progressbar"
        aria-valuenow={skill.value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${skill.name}: ${skill.value}%`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-400 transition-all duration-1000 ease-out"
          style={{ width: animate ? `${skill.value}%` : '0%' }}
        />
      </div>
    </div>
  )
}

function SkillGroupCard({ group, animate }: { group: SkillGroup; animate: boolean }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-navy-800 border-navy-800' : 'bg-white border-slate-200 shadow-sm'}`}>
      <p className="section-label mb-5">{group.category}</p>
      <div className="space-y-5">
        {group.skills.map(skill => (
          <SkillBar key={skill.name} skill={skill} animate={animate} />
        ))}
      </div>
    </div>
  )
}

export default function Skills() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [animate, setAnimate] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimate(true) },
      { threshold: 0.15 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="skills"
      ref={sectionRef}
      className={`py-24 ${isDark ? 'bg-navy-900' : 'bg-slate-100'}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="section-label text-center mb-2">What I Bring</p>
        <h2 className={`text-3xl sm:text-4xl font-bold text-center mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Skills
        </h2>
        <p className={`text-center mb-16 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          A snapshot of my technical and professional capabilities.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SKILL_GROUPS.map(group => (
            <SkillGroupCard key={group.category} group={group} animate={animate} />
          ))}
        </div>
      </div>
    </section>
  )
}
