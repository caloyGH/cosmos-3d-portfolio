import { Reveal, SectionLabel, Panel, CountUp, Heading } from './ui'
import { ABOUT } from '../../data/profile'
import me from '../../assets/me.jpg'

/** About: bio, photo and education. */
export default function About() {
  const edu = ABOUT.education
  return (
    <section id="about" className="relative flex min-h-svh flex-col justify-center px-6 py-28 md:px-16">
      <div className="flex w-full flex-col gap-14 lg:flex-row lg:items-start lg:justify-between">
        <div data-parallax="1" className="max-w-xl">
          <Reveal>
            <SectionLabel index="01">About</SectionLabel>
          </Reveal>

          <Heading
            className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl"
            parts={[{ t: 'Backend roots,' }, { t: 'frontend', accent: true }, { t: 'heart.' }]}
          />

          {ABOUT.bio.map((text, i) => (
            <Reveal key={i} delay={160 + i * 80}>
              <p className="mt-6 leading-relaxed text-white/60 md:text-lg">{text}</p>
            </Reveal>
          ))}

          {/* at a glance */}
          <Reveal delay={300}>
            <dl className="mt-8 divide-y divide-white/10 border-y border-white/10 font-mono text-xs uppercase tracking-widest">
              {ABOUT.facts.map((f) => (
                <div key={f.k} className="flex items-center justify-between gap-6 py-3">
                  <dt className="text-white/40">{f.k}</dt>
                  <dd className="flex items-center gap-2 text-right text-white/90">
                    {f.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon shadow-[0_0_8px_#00f0ff]" />}
                    {f.v}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={420}>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {ABOUT.stats.map((s) => (
                <Panel key={s.label} className="p-5">
                  <div className="font-display text-3xl font-semibold text-white md:text-4xl">
                    <CountUp to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/40">{s.label}</div>
                </Panel>
              ))}
            </div>
          </Reveal>
        </div>

        <div data-parallax="0.5" className="mx-auto w-full max-w-[300px] lg:mx-0 lg:mr-10 lg:max-w-[340px]">
          {ABOUT.photo && (
            <Reveal delay={200}>
              <Panel className="group/photo p-2">
                <div className="relative overflow-hidden">
                  <img
                    src={me}
                    alt="Portrait"
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover grayscale contrast-110 transition duration-700 group-hover/photo:grayscale-0"
                  />
                  {/* cyan duotone tint that fades on hover, so the photo matches the theme */}
                  <span className="pointer-events-none absolute inset-0 bg-neon/25 mix-blend-color transition-opacity duration-700 group-hover/photo:opacity-0" />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.3em] text-neon">
                    Caloocan · PH
                  </span>
                </div>
              </Panel>
            </Reveal>
          )}

          {edu && (
            <Reveal delay={320}>
              <Panel className="mt-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-neon/40 bg-neon/10 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-neon" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 9l10-5 10 5-10 5L2 9zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6" />
                    </svg>
                  </span>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Education</div>
                    <div className="mt-1 font-display text-lg font-semibold leading-tight text-white">{edu.degree}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-3 font-mono text-[11px] uppercase tracking-widest">
                  <span className="text-white/70">{edu.school}</span>
                  <span className="text-neon">{edu.status}</span>
                </div>
              </Panel>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  )
}
