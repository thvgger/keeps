export interface Note {
  id: string;
  title: string;
  color: string;
  paragraphs?: string[];
  listItems?: { id: string, text: string, completed?: boolean }[];
  orderedListItems?: string[];
  interactivePrompt?: string;
}

export const dummyNotes: Note[] = [
  {
    id: "1",
    title: "Buy honey 100% original",
    color: "bg-card-coral",
    paragraphs: [
      "Buy the new brand honey for my family. here's the pic."
    ]
  },
  {
    id: "2",
    title: "Plan for the today",
    color: "bg-card-yellow",
    listItems: [
      { id: "2-1", text: "Buy food", completed: true },
      { id: "2-2", text: "GYN", completed: false },
      { id: "2-3", text: "Meeting", completed: false },
      { id: "2-4", text: "Meeting", completed: false },
      { id: "2-5", text: "Meeting", completed: false },
      { id: "2-6", text: "Meeting", completed: false },
      { id: "2-7", text: "Meeting", completed: false },
      { id: "2-8", text: "Meeting", completed: false },
      { id: "2-9", text: "Meeting", completed: false }
    ]
  },
  {
    id: "3",
    title: "Tax payment before the end of march",
    color: "bg-card-blue",
    paragraphs: [
      "This is a reminder note, so as not to forget to pay taxes before the end of march, Don't miss it. you could be fined!",
      "List of assets that must be reported to the government, whether in the form of cash savings. that is mandatory things we have filling the tax payment to the government."
    ],
    orderedListItems: [
      "Audi RS7 sportback 5 seater",
      "Harley davidson street guide",
      "Lamborghini aventador",
      "Shopping of the downtown mall",
      "GST filling of the iPhone 14 pro max"
    ],
    interactivePrompt: "Tap here to continue"
  },
  {
    id: "4",
    title: "Grocery Shopping List",
    color: "bg-card-green",
    listItems: [
      { id: "4-1", text: "Milk & Eggs", completed: false },
      { id: "4-2", text: "Fresh Vegetables", completed: true },
      { id: "4-3", text: "Coffee beans", completed: false }
    ]
  },
  {
    id: "5",
    title: "Project Ideas for Q3",
    color: "bg-card-purple",
    paragraphs: [
      "Brainstorming session notes for the upcoming quarter.",
      "1. Refactor the mobile application to use React Native.",
      "2. Implement a new AI-driven recommendation engine.",
      "3. Improve accessibility across all web platforms."
    ]
  },
  {
    id: "6",
    title: "Weekend Trip Itinerary",
    color: "bg-card-pink",
    paragraphs: [
      "Flight leaves at 8:00 AM on Saturday. Don't forget to pack a jacket Hotel is booked under John's name Check-in is at 3:00 PM. lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. Quisquam, quod.Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. Quisquam, quod.Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. Quisquam, quod.Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. Quisquam, quod.Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. Quisquam, quod."
    ]
  },
  {
    id: "7",
    title: "Gym Routine",
    color: "bg-card-coral",
    listItems: [
      { id: "7-1", text: "Bench Press 3x10", completed: true },
      { id: "7-2", text: "Squats 4x8", completed: false },
      { id: "7-3", text: "Pull-ups 3xFailure", completed: false }
    ]
  },
  {
    id: "8",
    title: "Weekly Sync Notes",
    color: "bg-card-blue",
    paragraphs: [
      "Discussed the Q4 roadmap and upcoming marketing campaigns.",
      "Engineering team will focus on reducing technical debt this sprint, especially around the legacy authentication service.",
      "Next meeting scheduled for Thursday at 10 AM."
    ]
  },
  {
    id: "9",
    title: "Book Recommendations",
    color: "bg-card-yellow",
    listItems: [
      { id: "9-1", text: "Atomic Habits", completed: true },
      { id: "9-2", text: "Dune", completed: false },
      { id: "9-3", text: "The Three-Body Problem", completed: false },
      { id: "9-4", text: "Thinking, Fast and Slow", completed: false }
    ]
  },
  {
    id: "10",
    title: "Recipes to Try This Month",
    color: "bg-card-green",
    listItems: [
      { id: "10-1", text: "Creamy Tuscan Chicken", completed: true },
      { id: "10-2", text: "Beef Wellington", completed: false },
      { id: "10-3", text: "Homemade Pasta", completed: false },
      { id: "10-4", text: "Matcha Mille Crepe Cake", completed: false }
    ]
  },
  {
    id: "11",
    title: "Design Inspiration",
    color: "bg-card-purple",
    paragraphs: [
      "Look into bento-box layouts for the new dashboard redesign.",
      "Maybe incorporate more glassmorphism effects on the modals to give it a premium feel. Use subtle inner borders and heavy backdrop blurs.",
      "Check out the latest Awwwards winners for typography ideas."
    ]
  },
  {
    id: "12",
    title: "Apartment Hunting Checklist",
    color: "bg-card-coral",
    listItems: [
      { id: "12-1", text: "Check water pressure", completed: false },
      { id: "12-2", text: "Test all outlets", completed: false },
      { id: "12-3", text: "Look for water damage on ceilings", completed: false },
      { id: "12-4", text: "Measure living room for the couch", completed: false },
      { id: "12-5", text: "Check cell reception", completed: false }
    ]
  },
  {
    id: "13",
    title: "Gift Ideas for Mom",
    color: "bg-card-pink",
    listItems: [
      { id: "13-1", text: "Cashmere sweater", completed: false },
      { id: "13-2", text: "Espresso machine", completed: false },
      { id: "13-3", text: "Spa day voucher", completed: true },
      { id: "13-4", text: "Kindle Oasis", completed: false }
    ]
  },
  {
    id: "14",
    title: "Blog Post Draft: CSS Grid",
    color: "bg-card-yellow",
    paragraphs: [
      "CSS Grid is often misunderstood. In this post, I want to break down the difference between Grid and Flexbox.",
      "Grid is two-dimensional, meaning it handles both columns and rows. Flexbox is primarily one-dimensional.",
      "I should include code snippets showing how to build a masonry layout using the new CSS columns trick versus actual CSS grid."
    ]
  },
  {
    id: "15",
    title: "Learn Rust",
    color: "bg-card-blue",
    listItems: [
      { id: "15-1", text: "Read the Rust Book Chapter 1-3", completed: true },
      { id: "15-2", text: "Understand Ownership & Borrowing", completed: false },
      { id: "15-3", text: "Write a CLI tool", completed: false },
      { id: "15-4", text: "Look into WebAssembly with Rust", completed: false }
    ]
  },
  {
    id: "16",
    title: "Tech Stack for Next Side Project",
    color: "bg-card-purple",
    paragraphs: [
      "I'm thinking of using Next.js 15 with Turbopack for the frontend.",
      "For the backend, maybe a lightweight Go server or just serverless functions depending on the load.",
      "Definitely need to use Tailwind v4, the new CSS-only configuration is incredibly fast and clean."
    ]
  },
  {
    id: "17",
    title: "Movies to Watch",
    color: "bg-card-coral",
    listItems: [
      { id: "17-1", text: "Dune: Part Two", completed: true },
      { id: "17-2", text: "Oppenheimer", completed: true },
      { id: "17-3", text: "Poor Things", completed: false },
      { id: "17-4", text: "Past Lives", completed: false },
      { id: "17-5", text: "The Boy and the Heron", completed: false }
    ]
  },
  {
    id: "18",
    title: "Car Maintenance Schedule",
    color: "bg-card-green",
    paragraphs: [
      "Oil change due at 45,000 miles. Don't forget to ask them to check the brake pads.",
      "Tire rotation should probably happen before the winter hits.",
      "Need to buy a new cabin air filter and replace it myself to save $50."
    ]
  },
  {
    id: "19",
    title: "Workout Playlist",
    color: "bg-card-pink",
    listItems: [
      { id: "19-1", text: "Till I Collapse - Eminem", completed: false },
      { id: "19-2", text: "Can't Be Touched - Roy Jones Jr.", completed: false },
      { id: "19-3", text: "POWER - Kanye West", completed: false },
      { id: "19-4", text: "X Gon' Give It To Ya - DMX", completed: false },
      { id: "19-5", text: "Remember the Name - Fort Minor", completed: false }
    ]
  },
  {
    id: "20",
    title: "Q4 Goals",
    color: "bg-card-blue",
    orderedListItems: [
      "Launch the new marketing site",
      "Hit $10k MRR on the SaaS product",
      "Run a half-marathon under 2 hours",
      "Read at least 6 non-fiction books"
    ],
    paragraphs: [
      "Remember to pace yourself. It's a marathon, not a sprint."
    ]
  },
  {
    id: "21",
    title: "Coffee Shops to Visit",
    color: "bg-card-yellow",
    listItems: [
      { id: "21-1", text: "The Daily Grind", completed: true },
      { id: "21-2", text: "Bean & Leaf", completed: false },
      { id: "21-3", text: "Roastology", completed: false },
      { id: "21-4", text: "Espresso Express", completed: false }
    ]
  },
  {
    id: "22",
    title: "Journal Entry: May 4th",
    color: "bg-card-purple",
    paragraphs: [
      "Today was surprisingly productive. I finally managed to finish the refactoring task that's been dragging on all week.",
      "The weather was amazing too. I took a long walk during lunch and listened to a great podcast about artificial intelligence.",
      "Looking forward to the weekend. I need to make sure I don't overbook myself and actually get some rest."
    ]
  },
  {
    id: "23",
    title: "React Best Practices",
    color: "bg-card-green",
    paragraphs: [
      "Always use functional components and hooks. Class components are legacy.",
      "Keep state as close to where it's needed as possible. Avoid unnecessary global state.",
      "Use memoization (useMemo, useCallback, React.memo) judiciously, only when performance is actually an issue.",
      "Don't put everything in useEffect. Many things can be calculated directly during render."
    ]
  },
  {
    id: "24",
    title: "House Chores for Sunday",
    color: "bg-card-coral",
    listItems: [
      { id: "24-1", text: "Vacuum the living room and bedrooms", completed: false },
      { id: "24-2", text: "Mop the kitchen floor", completed: false },
      { id: "24-3", text: "Clean the bathrooms", completed: false },
      { id: "24-4", text: "Do the laundry (whites and colors)", completed: false },
      { id: "24-5", text: "Take out the trash and recycling", completed: false }
    ]
  },
  {
    id: "25",
    title: "Startup Ideas",
    color: "bg-card-blue",
    paragraphs: [
      "A platform connecting freelance chefs with people who want in-home dining experiences.",
      "An AI-powered tool that automatically generates unit tests for legacy codebases.",
      "A subscription box for high-quality, rare houseplants.",
      "An app that gamifies learning personal finance for teenagers."
    ]
  },
  {
    id: "26",
    title: "",
    color: "bg-card-blue",
    paragraphs: [
      "This is a random note."
    ]
  }
];

export async function fetchNotes(): Promise<Note[]> {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(dummyNotes);
    }, 500);
  });
}
