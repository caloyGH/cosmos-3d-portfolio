import { Section, Reveal, SectionLabel, Panel, Bar, Heading } from './ui'
import { SKILLS } from '../../data/profile'

export default function Stack() {
  return (
    <Section id="stack">
      <div data-parallax="0.6" className="w-full">
        <Reveal>
          <SectionLabel index="03">Tech Stack</SectionLabel>
        </Reveal>

        <Heading
          className="mb-12 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl"
          parts={[{ t: 'The' }, { t: 'toolkit.', accent: true }]}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map((s, i) => (
            <Reveal key={s.name} delay={(i % 4) * 80}>
              <Panel className="p-5">
                <div className="mb-5 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-semibold text-white">{s.name}</h3>
                  <span className="font-mono text-xs text-neon">{s.level}%</span>
                </div>
                <Bar level={s.level} />
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/40">{s.cat}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
