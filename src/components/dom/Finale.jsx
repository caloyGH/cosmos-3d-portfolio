import { PROFILE } from '../../data/profile'
import { scrollToSection } from '../../hooks/useScrollSections'

/** The last words, shown over the black hole once the scene has been swallowed (opacity is driven by --reveal, see useScrollSections). */
export default function Finale() {
  return (
    <div id="finale-ui" data-on="0" aria-live="polite">
      <div className="fin-card px-6">
        <p className="fin-kicker">End of the map</p>
        <p className="fin-sub">Everything ends up here. Let&apos;s build something before it does.</p>
        <button type="button" className="fin-btn" onClick={() => scrollToSection('hero')}>
          Back to start <span aria-hidden="true">↑</span>
        </button>
      </div>
      <p className="fin-copy">
        © {new Date().getFullYear()} {PROFILE.brand} — {PROFILE.location}
      </p>
    </div>
  )
}
