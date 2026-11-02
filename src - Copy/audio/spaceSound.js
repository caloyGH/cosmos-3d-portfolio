// Tiny synthesized soundscape (no audio files): a low breathing drone, a "wind" that grows with scroll speed, and a soft
// two-note chime when you arrive at a new section. Starts only after a click (browsers require it), muted until then.
export function createSpaceSound() {
  let ctx = null
  let master = null
  let wind = null
  let windFilter = null
  let on = false

  const noiseBuffer = (c) => {
    const len = c.sampleRate * 2
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0
    for (let i = 0; i < len; i++) { // pink-ish noise: softer than white
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2
    }
    return buf
  }

  const build = () => {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    // drone: two slightly detuned low sines + a quiet octave, through a low-pass that slowly breathes
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.55
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 260
    lp.Q.value = 0.7
    for (const [type, f, g] of [['sine', 55, 0.5], ['sine', 55.45, 0.5], ['triangle', 110.2, 0.12], ['sine', 82.4, 0.16]]) {
      const o = ctx.createOscillator()
      const og = ctx.createGain()
      o.type = type
      o.frequency.value = f
      og.gain.value = g
      o.connect(og).connect(lp)
      o.start()
    }
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.06
    lfoGain.gain.value = 90
    lfo.connect(lfoGain).connect(lp.frequency)
    lfo.start()
    lp.connect(droneGain).connect(master)

    // wind: looping noise through a band-pass whose level / pitch follow the scroll speed
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    src.loop = true
    windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 350
    windFilter.Q.value = 0.5
    wind = ctx.createGain()
    wind.gain.value = 0
    src.connect(windFilter).connect(wind).connect(master)
    src.start()
    return true
  }

  return {
    get on() { return on },
    async start() {
      if (!ctx && !build()) return false
      if (ctx.state === 'suspended') await ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4)
      on = true
      return true
    },
    stop() {
      if (!ctx) return
      on = false
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
      setTimeout(() => { if (!on && ctx) ctx.suspend() }, 1200)
    },
    /** call every frame with the scroll speed (sections per second) */
    update(vel) {
      if (!ctx || !on) return
      const v = Math.min(Math.max(vel, 0), 2)
      wind.gain.setTargetAtTime(Math.min(v / 1.4, 1) * 0.5, ctx.currentTime, 0.15)
      windFilter.frequency.setTargetAtTime(300 + v * 900, ctx.currentTime, 0.2)
    },
    /** soft chime when you arrive somewhere new */
    chime() {
      if (!ctx || !on) return
      const t = ctx.currentTime
      for (const [f, d, g] of [[660, 0, 0.1], [990, 0.12, 0.07]]) {
        const o = ctx.createOscillator()
        const og = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = f
        og.gain.setValueAtTime(0, t + d)
        og.gain.linearRampToValueAtTime(g, t + d + 0.03)
        og.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.6)
        o.connect(og).connect(master)
        o.start(t + d)
        o.stop(t + d + 1.7)
      }
    },
  }
}
