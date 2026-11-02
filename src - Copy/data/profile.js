// ✏️ Edit your personal info here. The whole site reads from this file.

export const PROFILE = {
  brand: 'COSMOS',
  title: 'Cosmos — Java → Frontend Developer', // browser tab title
  role: 'Java → Frontend Developer',
  location: 'Caloocan, Metro Manila',
  status: 'Available for Work',
  email: 'carlotolentino17@gmail.com',
  github: 'https://github.com/caloyGH',
  linkedin: '', // e.g. 'https://www.linkedin.com/in/your-handle'  (empty = hidden)
  cv: '', // put a PDF in /public and set e.g. '/cv.pdf'            (empty = hidden)
}

// IO: the orb that guides visitors. It introduces itself in the hero, then follows the scroll.
const MASTER = 'Cosmos' // who IO works for: change this to your name / nickname

export const IO = {
  name: 'IO',
  style: 'mascot', // 'mascot' = cute 2D guide (default) | 'orb' = 3D glass orb
  master: MASTER,
  lines: [
    "Hi there! I'm IO. ✨",
    `Welcome to the website of my master, ${MASTER}!`,
    "He loves building things like this and solving problems, and he enjoys every bit of it.",
    "I'll be your guide today. Scroll down, I'll be right beside you!",
  ],
  cue: 'Scroll down',
  // short remarks IO makes when you arrive at a section (index = section: 1 about, 2 work, 3 stack, 4 contact)
  hints: {
    1: `This is ${MASTER} himself. Say hi!`,
    2: `Here are some worlds my master built.`,
    3: `The tools ${MASTER} flies with.`,
    4: "You made it, thanks for flying with me! If you'd like to work with my master, drop him a message and let's make it happen.",
  },
  stay: [4], // sections where IO keeps the remark on screen until you leave
}

// Scroll story shown right after the hero while you fly through the ring gates.
// side: which side of the screen the caption sits on
export const STORY = [
  { icon: 'code', side: 'left', text: 'I started in Java: logic, structure and a lot of problem-solving.' },
  { icon: 'layers', side: 'right', text: 'Then I fell for the frontend, where code turns into something you can touch.' },
  { icon: 'orbit', side: 'left', text: 'Now I build small worlds in the browser. Keep scrolling.' },
]

export const ABOUT = {
  photo: true, // photo lives in src/assets/me.jpg (set false to hide)
  education: { degree: 'BS Computer Engineering', school: 'University of the East · Caloocan', status: 'Graduate' },
  bio: [
    'I started as a Java developer: logic, structure, problem-solving. Then curiosity pulled me to the frontend, where code becomes something people can see and touch.',
    'Now I build interactive, polished interfaces with React, Tailwind and WebGL, mostly through self-driven projects.',
  ],
  // quick "at a glance" facts: easy to scan
  facts: [
    { k: 'Role', v: 'Java → Frontend Developer' },
    { k: 'Based in', v: 'Caloocan, Metro Manila' },
    { k: 'Focus', v: 'React · Tailwind · WebGL' },
    { k: 'Status', v: 'Open to opportunities', live: true },
  ],
  stats: [
    { value: 1, suffix: '+', label: 'Year of experience' },
    { value: 2, suffix: '', label: 'Core stacks · Java & React' },
  ],
}

// soon: true  -> shows a dimmed "coming soon" card (no link)
export const PROJECTS = [
  {
    id: '01',
    title: 'Cosmos Portfolio',
    type: '3D Interactive Site',
    desc: 'This very site: a scroll-driven WebGL portfolio with a custom GLSL ribbon shader, 3D scenes and a HUD-style interface.',
    tags: ['React', 'R3F', 'GLSL', 'Tailwind'],
    link: 'https://github.com/caloyGH',
  },
  {
    id: '02',
    title: 'Project 02',
    type: 'Coming soon',
    desc: 'Your next featured project goes here.',
    tags: [],
    soon: true,
  },
  {
    id: '03',
    title: 'Project 03',
    type: 'Coming soon',
    desc: 'Your next featured project goes here.',
    tags: [],
    soon: true,
  },
]

// level = rough self-rating (0-100). Adjust to what feels honest.
export const SKILLS = [
  { name: 'Java', cat: 'Backend', level: 80 },
  { name: 'JavaScript', cat: 'Language', level: 70 },
  { name: 'React', cat: 'Frontend', level: 70 },
  { name: 'HTML & CSS', cat: 'Frontend', level: 75 },
  { name: 'Tailwind CSS', cat: 'Styling', level: 75 },
  { name: 'Three.js / R3F', cat: '3D / WebGL', level: 50 },
  { name: 'GSAP', cat: 'Motion', level: 55 },
  { name: 'Git & GitHub', cat: 'Tooling', level: 70 },
]
