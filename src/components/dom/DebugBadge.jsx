import { useEffect, useState } from 'react'
import { scrollState } from '../../store/scroll'

/** Only with ?debug in the address: a tiny readout (version, scroll, finale progress, shader errors) to send me when something looks wrong. */
export default function DebugBadge() {
  const on = typeof window !== 'undefined' && /[?&]debug/.test(window.location.search)
  const [txt, setTxt] = useState('')
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => {
      const errs = window.__cosmosErrors || []
      setTxt(`v71 | pos ${scrollState.pos.toFixed(2)} | fin ${scrollState.fin.toFixed(2)} | ${window.innerWidth}x${window.innerHeight} | shader errors: ${errs.length}${errs.length ? '\n' + errs.slice(0, 2).join('\n') : ''}`)
    }, 250)
    return () => clearInterval(id)
  }, [on])
  if (!on) return null
  return <pre style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 99999, margin: 0, padding: '6px 8px', maxWidth: '90vw', whiteSpace: 'pre-wrap', font: '11px/1.4 monospace', color: '#0f0', background: 'rgba(0,0,0,.85)', border: '1px solid #0f0' }}>{txt}</pre>
}
