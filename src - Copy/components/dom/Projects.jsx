import { useEffect, useRef } from 'react'
import { Section, Reveal, SectionLabel, Heading } from './ui'
import { PROJECTS } from '../../data/profile'
import { attachTilt } from '../../hooks/tilt'

// Animated "screen" for each card. Replace with a real screenshot later: add `image: '/shots/x.png'` to the project.
function Shot({ p }) {
  return (
    <div className="pshot">
      {p.image ? (
        <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : p.soon ? (
        <>
          <span className="bar" style={{ top: '22%', width: '50%' }} />
          <span className="bar pulse" style={{ top: '34%', width: '68%' }} />
          <span className="bar" style={{ top: '46%', width: '36%' }} />
          <span className="bar pulse" style={{ top: '58%', width: '58%' }} />
          <span className="stamp">CLASSIFIED</span>
        </>
      ) : (
        <>
          <span className="ring" style={{ width: 150, height: 150 }} />
          <span className="ring" style={{ width: 96, height: 96 }} />
          <span className="orbit" style={{ width: 150, height: 150 }}>
            <i />
          </span>
          <span className="orbit" style={{ width: 96, height: 96, animationDuration: '11s', animationDirection: 'reverse' }}>
            <i />
          </span>
          <span className="core" />
        </>
      )}
      <span className="sweep" />
      <i className="corner c1" />
      <i className="corner c2" />
      <i className="corner c3" />
      <i className="corner c4" />
    </div>
  )
}

function Card({ p }) {
  const ref = useRef(null)
  useEffect(() => (p.soon ? undefined : attachTilt(ref.current)), [p.soon])

  const inner = (
    <>
      <Shot p={p} />
      <div className="lift p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-xs text-neon">{p.id}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">{p.type}</span>
        </div>
        <h3 className="mt-2 font-display text-xl font-semibold text-white md:text-2xl">
          {p.title} {!p.soon && <span className="text-neon">↗</span>}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{p.desc}</p>
        {p.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <span key={t} className="border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="pcard-wrap">
      {p.soon ? (
        <div ref={ref} className="pcard opacity-70" data-soon="true">
          {inner}
        </div>
      ) : (
        <a ref={ref} href={p.link} target="_blank" rel="noreferrer" className="pcard">
          {inner}
        </a>
      )}
    </div>
  )
}

export default function Projects() {
  return (
    <Section id="projects">
      <div data-parallax="1" className="w-full max-w-6xl">
        <Reveal>
          <SectionLabel index="02">Selected Work</SectionLabel>
        </Reveal>

        <Heading
          className="mb-10 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl"
          parts={[{ t: "Things I've" }, { t: 'built.', accent: true }]}
        />

        <div className="grid gap-5 md:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.id} delay={i * 120}>
              <Card p={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
