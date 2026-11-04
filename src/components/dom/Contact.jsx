import ContactCard from './ContactCard'

/** Contact: an open layout on the left so the planet on the right stays visible (IO talks next to it, see IoBubble). */
export default function Contact() {
  return (
    <>
    {/* tall on purpose: the stage inside is pinned while you keep scrolling, and that extra scroll drives the black hole finale */}
    <section id="contact" className="finale-wrap relative">
      <div className="finale-stage sticky top-0 flex h-screen flex-col justify-center px-6 py-24 md:px-16">
        <div className="sink-wrap">
          <ContactCard />
        </div>
        <p className="finale-hint" aria-hidden="true">
          One more thing <span>↓</span>
        </p>
      </div>
    </section>
    {/* short or narrow screens: Contact cannot be pinned (it does not fit), so the finale gets its own scroll track after it */}
    <div id="finale-track" className="finale-track" aria-hidden="true" />
    </>
  )
}
