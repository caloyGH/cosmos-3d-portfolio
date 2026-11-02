import { useEffect } from 'react'
import Experience from './components/canvas/Experience'
import Loader from './components/dom/Loader'
import Cursor from './components/dom/Cursor'
import Navbar from './components/dom/Navbar'
import Hero from './components/dom/Hero'
import Contact from './components/dom/Contact'
import SoundToggle from './components/dom/SoundToggle'
import Meteors from './components/dom/Meteors'
import PlanetTag from './components/dom/PlanetTag'
import IoBubble from './components/dom/IoBubble'
import IoMascot from './components/dom/IoMascot'
import Story from './components/dom/Story'
import About from './components/dom/About'
import Projects from './components/dom/Projects'
import Stack from './components/dom/Stack'
import SceneSelector from './components/dom/SceneSelector'
import SideProgress from './components/dom/SideProgress'
import Telemetry from './components/dom/Telemetry'
import useScrollSections from './hooks/useScrollSections'
import useDepthScroll from './hooks/useDepthScroll'
import useParallax from './hooks/useParallax'
import useMagnetic from './hooks/useMagnetic'
import { SCENES } from './data/scenes'
import { PROFILE } from './data/profile'

export default function App() {
  const section = useScrollSections()
  useParallax()
  useMagnetic()
  useDepthScroll()

  useEffect(() => {
    document.title = PROFILE.title
  }, [])

  return (
    <>
      <Loader />
      <Cursor />

      {/* fixed 3D layer behind everything */}
      <div className="fixed inset-0 z-0">
        <Experience />
      </div>
      <div className="hud-grid pointer-events-none fixed inset-0 z-[1]" />
      <Meteors />
      <div className="grain" aria-hidden="true" />
      <IoMascot />
      <IoBubble />
      <PlanetTag />
      <SoundToggle />

      {/* normal page scroll */}
      <div className="relative z-10">
        <Navbar section={section} />
        <main>
          <Hero />
          <Story />
          <About />
          <Projects />
          <Stack />
          <Contact />
        </main>
      </div>

      <SceneSelector scenes={SCENES} section={section} />
      <SideProgress section={section} />
      <Telemetry section={section} />
    </>
  )
}
