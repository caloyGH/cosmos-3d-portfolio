# 3D Interactive Portfolio - Project Guidelines

## Tech Stack
- Framework: React / Next.js (o Vite)
- 3D Engine: Three.js / React Three Fiber (R3F)
- Helpers: @react-three/drei, GSAP / Framer Motion
- Styling: Tailwind CSS

## Design Theme & Vibe
- Theme: Futuristic & Professional (Sleek Sci-Fi, Cyber-minimalist)
- Colors: Dark Slate (`#0a0a0a`), Neon Cyan (`#00f0ff`), Crisp White (`#ffffff`)
- Lighting: Soft ambient with subtle bloom & rim lighting.

## Core Rules for Claude Code
1. Keep 3D scene files separate: `src/components/canvas/` (3D scene) vs `src/components/dom/` (HTML UI).
2. Do not scan large 3D model files (.glb/.gltf) or images.
3. Be direct and concise in your code edits to save tokens.