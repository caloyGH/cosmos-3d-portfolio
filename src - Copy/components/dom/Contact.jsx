import { PROFILE } from '../../data/profile'
import ContactCard from './ContactCard'

const SOCIALS = [
  { label: 'GitHub', href: PROFILE.github },
  PROFILE.linkedin && { label: 'LinkedIn', href: PROFILE.linkedin },
].filter(Boolean)

/** Contact: the glass card (IO talks next to it, see IoBubble) and the footer. */
export default function Contact() {
  return (
    <section id="contact" className="relative flex min-h-screen flex-col justify-center px-6 py-24 md:px-16">
      <ContactCard />

      <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-widest text-white/40">
        <span>
          © {new Date().getFullYear()} {PROFILE.brand} — {PROFILE.location}
        </span>
        <div className="flex gap-6">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="transition hover:text-neon">
              {s.label}
            </a>
          ))}
          <a href="#hero" className="transition hover:text-neon">
            Back to top ↑
          </a>
        </div>
      </footer>
    </section>
  )
}
