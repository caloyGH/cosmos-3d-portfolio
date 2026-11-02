import { Component } from 'react'

/** If WebGL cannot start (blocked, lost, no GPU) the 3D layer is skipped and the rest of the site keeps working. */
export default class GlBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.warn('3D background disabled:', err?.message || err) }
  render() {
    if (this.state.failed) {
      return <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 70% at 50% 40%, #10285a 0%, #070d1d 70%, #05070f 100%)' }} />
    }
    return this.props.children
  }
}
