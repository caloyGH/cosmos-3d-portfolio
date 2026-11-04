import { useState } from 'react'
import { Reveal, Heading } from './ui'
import { PROFILE } from '../../data/profile'

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
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
}

/** Contact: open layout (no card), copy-email, socials and a quick "write to me" box. */
export default function ContactCard() {
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

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
    PROFILE.cv && { label: 'Download CV', href: PROFILE.cv, icon: 'download', download: true },
  ].filter(Boolean)

  return (
    <Reveal>
      {/* open layout, no card: the text sits on the left and the planet (Neptune, on the right) stays visible */}
      <div className="cta-open max-w-[34rem]">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-neon">
          <span className="h-2 w-2 rounded-full bg-neon" />
          Contact · {PROFILE.status}
        </p>

        <Heading
          className="mt-4 font-display text-[2rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-4xl md:text-6xl"
          parts={[{ t: "Let's build something" }, { t: 'impossible.', accent: true }]}
        />

        <p className="mt-4 max-w-sm text-white/60 md:text-lg">Have a project, an opportunity, or just want to say hi? My inbox is open.</p>

        <button
          data-magnetic
          type="button"
          onClick={copy}
          className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-4 py-3 font-mono text-[13px] text-white transition sm:gap-3 sm:px-6 sm:text-sm hover:bg-neon/20"
        >
          <span className="text-neon"><Icon d={ICONS.mail} /></span>
          {PROFILE.email}
          <span className="ml-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-neon">
            {copied ? '✓ Copied' : <><Icon d={ICONS.copy} /> <span className="max-sm:hidden">Copy</span></>}
          </span>
        </button>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-white/55">
          {socials.map((s) => (
            <a key={s.label} href={s.href} download={s.download ? '' : undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 py-1 transition hover:text-neon">
              <Icon d={ICONS[s.icon]} />
              {s.label}
            </a>
          ))}
        </div>

        {/* quick message: opens your mail app with the text filled in (no backend needed) */}
        <div className="cta-box mt-5 flex items-end gap-3 p-3 pl-4">
          <textarea
            id="quick-msg"
            aria-label="Quick message"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={2}
            placeholder="Quick message: Hi! I'd like to talk about…"
            className="min-w-0 flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-white/30"
          />
          <a href={mailto} data-magnetic aria-label="Send via email" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neon text-black transition hover:shadow-[0_0_24px_rgba(0,240,255,0.6)]">
            <Icon d={ICONS.arrow} />
          </a>
        </div>
      </div>
    </Reveal>
  )
}
