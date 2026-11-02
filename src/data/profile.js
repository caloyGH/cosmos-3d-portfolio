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
  cv: '/Mark-Carlo-Tolentino-CV.pdf', // PDF lives in /public  (empty = hidden)
}

// IO: the orb that guides visitors. It introduces itself in the hero, then follows the scroll.
const MASTER = 'Cosmos' // who IO works for: change this to your name / nickname

// The first thing a visitor reads: who you are and what you can do for them (shown on the hero, edit freely)
export const IO = {
  name: 'IO',
  style: 'mascot', // 'mascot' = cute 2D guide (default) | 'orb' = 3D glass orb
  master: MASTER,
  lines: [
    "Hi there! I'm IO. ✨",
    `Welcome to the website of my master, ${MASTER}!`,
    "Need a website, a web app or an AI-powered tool? He builds it end to end, fast and polished.",
    "See his work below. Scroll down, I'll be right beside you!",
  ],
  cue: 'Scroll down',
  // short remarks IO makes when you arrive at a section (index = section: 1 about, 2 work, 3 stack, 4 contact)
  hints: {
    1: `This is ${MASTER} himself. Say hi!`,
    2: `Here are some worlds my master built.`,
    3: `The tools ${MASTER} flies with.`,
    4: "If you'd like to work with my master, drop him a message and let's make it happen.",
  },
  // IO's last "words": no text, only a heart made of heart emojis (X = emoji, . = empty), see IoBubble
  finaleText: 'Thanks for flying with me.', // IO's last line, above the heart
  finaleHeart: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
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
// video / poster -> hover plays a preview in the card, click opens the full demo (put files in /public/projects)
// link           -> optional: opens when the card is clicked (used when there is no video)
export const PROJECTS = [
  {
    id: '01',
    title: 'PROYEKTO',
    type: 'Full-Stack · E-Commerce',
    desc: 'Streetwear store with inventory tracking and an admin dashboard for orders, payments and revenue. Spring Boot backend, vanilla JavaScript front end.',
    tags: ['Spring Boot', 'Java', 'JavaScript', 'REST'],
    video: '/projects/proyekto.mp4',
    poster: '/projects/proyekto.jpg',
  },
  {
    id: '02',
    title: 'Cosmos Portfolio',
    type: '3D Interactive Site',
    desc: 'This very site: a scroll-driven WebGL portfolio with procedural planets, a mascot guide and a HUD-style interface.',
    tags: ['React', 'R3F', 'GLSL', 'Tailwind'],
    link: 'https://github.com/caloyGH',
  },
  {
    id: '03',
    title: 'AI Branding Engine',
    type: 'Multi-Agent AI · Ongoing',
    desc: 'Multi-agent platform that chains market research and visual design workflows, with caching to stay within API rate limits.',
    tags: ['Python', 'CrewAI', 'Streamlit', 'Groq'],
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
