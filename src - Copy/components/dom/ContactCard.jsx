import { useEffect, useRef, useState } from 'react'
import { Reveal, Heading } from './ui'
import { PROFILE } from '../../data/profile'
import { attachTilt } from '../../hooks/tilt'

const TICKER = ['Open to opportunities', 'Java → Frontend', 'React', 'Three.js', 'Tailwind', 'Caloocan, PH']

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const ICONS = {
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  github: 'M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.4 2.5 5.4 2.8 5.4 2.8a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.3c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  linkedin: 'M4 9h4v11H4zM6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h4v1.6c.8-1.2 2-1.9 3.6-1.9 3 0 3.4 2 3.4 4.6V20h-4v-5.8c0-1.3-.3-2.200-1.600-2.200-1.400 0-2 1-2 2.400V20h-4z',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  arrow: 'M5 12h14M13 6l6 6-6 6',
}

/** Contact: a glass card with a rotating gradient edge, cursor spotlight, copy-email and a quick "write to me" box. */
export default function ContactCard() {
  const card = useRef(null)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => attachTilt(card.current, { max: 3 }), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email)
    } catch {
      const t = document.createElement('textarea')
      t.value = PROFILE.email
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const mailto = `mailto:${PROFILE.email}?subject=${encodeURIComponent('Hello from your portfolio')}&body=${encodeURIComponent(msg)}`
  const socials = [
    { label: 'GitHub', href: PROFILE.github, icon: 'github' },
    PROFILE.linkedin && { label: 'LinkedIn', href: PROFILE.linkedin, icon: 'linkedin' },
  ].filter(Boolean)

  return (
    <Reveal>
      <div className="cta-wrap">
        <div ref={card} className="cta relative overflow-hidden p-8 md:p-12">
          {/* decorative orbit rings */}
          <span className="cta-orbit cta-orbit-a" />
          <span className="cta-orbit cta-orbit-b" />

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-neon">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
                </span>
                Contact · {PROFILE.status}
              </p>

              <Heading
                className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl"
                parts={[{ t: "Let's build something" }, { t: 'impossible.', accent: true }]}
              />

              <p className="mt-5 max-w-md text-white/60 md:text-lg">
                Have a project, an opportunity, or just want to say hi? My inbox is open.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  data-magnetic
                  type="button"
                  onClick={copy}
                  className="group inline-flex items-center gap-3 rounded-full border border-neon/40 bg-neon/10 px-6 py-3 font-mono text-sm text-white transition hover:bg-neon/20 hover:shadow-[0_0_30px_rgba(0,240,255,0.35)]"
                >
                  <span className="text-neon"><Icon d={ICONS.mail} /></span>
                  {PROFILE.email}
                  <span className="ml-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-neon">
                    {copied ? '✓ Copied' : <><Icon d={ICONS.copy} /> Copy</>}
                  </span>
                </button>
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    data-magnetic
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white transition hover:border-neon/50 hover:text-neon"
                  >
                    <Icon d={ICONS[s.icon]} />
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            {/* quick message: opens your mail app with the text filled in (no backend needed) */}
            <div className="cta-box p-5">
              <label htmlFor="quick-msg" className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Quick message
              </label>
              <textarea
                id="quick-msg"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={4}
                placeholder="Hi! I'd like to talk about…"
                className="mt-3 w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-white/30"
              />
              <a
                href={mailto}
                data-magnetic
                className="mt-3 inline-flex w-full items-center justify-between rounded-full bg-neon px-6 py-3 text-sm font-semibold text-black transition hover:shadow-[0_0_30px_rgba(0,240,255,0.6)]"
              >
                Send via email
                <Icon d={ICONS.arrow} />
              </a>
            </div>
          </div>

          {/* ticker */}
          <div className="cta-ticker relative mt-12 overflow-hidden border-t border-white/10 pt-5" aria-hidden="true">
            <div className="cta-track flex w-max gap-10 font-mono text-[11px] uppercase tracking-[0.3em] text-white/35">
              {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                  {t}
                  <span className="text-neon/60">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  )
}
