import { Section, Reveal, SectionLabel, Panel, Heading } from './ui'
import NanoSwarm from './NanoSwarm'
import { SKILLS } from '../../data/profile'

export default function Stack() {
  return (
    <Section id="stack">
      {/* tiny nanobots drifting through the section; squads swarm to a card and frame it */}
      <NanoSwarm />
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
              <div data-bot={s.name}>
                <Panel className="p-5">
                  <h3 className="font-display text-lg font-semibold text-white">{s.name}</h3>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/40">{s.cat}</p>
                </Panel>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
