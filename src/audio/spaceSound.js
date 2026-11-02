// Tiny synthesized soundscape (no audio files): a very soft airy pad (no bass), a faint "air" that grows with scroll speed, and a soft
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

    // a very soft airy pad: a gentle open chord (C, G, D, E), no bass at all, slowly fading in and out
    const padGain = ctx.createGain()
    padGain.gain.value = 0.5
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1400
    lp.Q.value = 0.3
    const swell = ctx.createGain() // the slow breathing
    swell.gain.value = 0.7
    for (const [f, g] of [[261.63, 0.05], [392.0, 0.045], [587.33, 0.03], [659.25, 0.025]]) {
      for (const det of [-0.6, 0.6]) {
        const o = ctx.createOscillator()
        const og = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = f + det
        og.gain.value = g
        o.connect(og).connect(lp)
        o.start()
      }
    }
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.07
    lfoGain.gain.value = 0.3
    lfo.connect(lfoGain).connect(swell.gain)
    lfo.start()
    lp.connect(swell).connect(padGain).connect(master)

    // wind: looping noise through a band-pass whose level / pitch follow the scroll speed
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    src.loop = true
    windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 1200
    windFilter.Q.value = 0.4
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
      master.gain.setTargetAtTime(0.22, ctx.currentTime, 0.8)
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
      wind.gain.setTargetAtTime(Math.min(v / 1.4, 1) * 0.07, ctx.currentTime, 0.15)
      windFilter.frequency.setTargetAtTime(1000 + v * 1400, ctx.currentTime, 0.2)
    },
    /** soft chime when you arrive somewhere new */
    chime() {
      if (!ctx || !on) return
      const t = ctx.currentTime
      for (const [f, d, g] of [[784, 0, 0.05], [1174.7, 0.14, 0.035]]) {
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
