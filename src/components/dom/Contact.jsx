import { PROFILE } from '../../data/profile'
import ContactCard from './ContactCard'

const SOCIALS = [
  { label: 'GitHub', href: PROFILE.github },
  PROFILE.linkedin && { label: 'LinkedIn', href: PROFILE.linkedin },
  PROFILE.cv && { label: 'Download CV', href: PROFILE.cv, download: true },
].filter(Boolean)

/** Contact: the glass card (IO talks next to it, see IoBubble) and the footer. */
export default function Contact() {
  return (
    // tall on purpose: the stage inside is pinned while you keep scrolling, and that extra scroll drives the black hole finale
    <section id="contact" className="finale-wrap relative">
      <div className="finale-stage sticky top-0 flex h-screen flex-col justify-center px-6 py-24 md:px-16">
        <div className="sink-wrap">
          <ContactCard />

          <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-widest text-white/40">
            <span>
              © {new Date().getFullYear()} {PROFILE.brand} — {PROFILE.location}
            </span>
            <div className="flex gap-6">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" download={s.download ? '' : undefined} className="transition hover:text-neon">
                  {s.label}
                </a>
              ))}
              <a href="#hero" className="transition hover:text-neon">
                Back to top ↑
              </a>
            </div>
          </footer>
        </div>
        <p className="finale-hint" aria-hidden="true">
          One more thing <span>↓</span>
        </p>
      </div>
    </section>
  )
}
