// phones: lighter on the GPU (smaller canvas, no MSAA, fewer extras), so scrolling stays smooth and the battery lasts
export const PHONE = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 767px)').matches
