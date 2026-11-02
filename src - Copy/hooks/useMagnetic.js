import { useEffect } from 'react'
import { attachMagnetic } from './magnetic'

export default function useMagnetic() {
  useEffect(() => attachMagnetic(), [])
}
