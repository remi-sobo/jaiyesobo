/**
 * The history file. This is the only part you edit.
 *
 * One school year. Add one unit after each Thursday lesson by copying a unit
 * block and filling it in. Units show in the order they're listed.
 *
 * threads: use the ids from `threads` below. They tag which big ideas a unit
 * adds to.
 * status: "done" for taught units, "next" for what's coming.
 *
 * Voice rules: no dashes as punctuation, no exclamation points, no emoji.
 */

export type ThreadId =
  | "decides"
  | "formula"
  | "twotrue"
  | "uninvited"
  | "pushed"
  | "resist";

export type HistoryThread = {
  id: ThreadId;
  name: string;
  text: string;
};

export type HistoryUnit = {
  when: string;
  title: string;
  bigIdea: string;
  facts: string[];
  argued: string;
  made: string;
  threads: ThreadId[];
  status: "done" | "next";
};

export type HistoryYear = {
  year: string;
  title: string;
  titleEm: string;
  question: string;
  intro: string;
  arc: string[];
  threads: HistoryThread[];
  units: HistoryUnit[];
};

export const history: HistoryYear = {
  year: "2026/27",
  title: "The Story",
  titleEm: "So Far.",
  question:
    "How did the place we live come to be, and who had to fight to be counted?",
  intro:
    "This year we're learning American history through the lens of Black people. We started at home in East Palo Alto, went back to the founding, and kept asking the same questions every week. Every unit ends with an argument and something we made.",

  arc: [
    "We started with our own city: who was here first, and who had to fight to stay.",
    "Then the founding. A country started by people who didn't want to be owned, that went on to own people.",
    "Then work and money. Who does the work, who gets paid, and what happens when workers stand together.",
    "Then power. Who decides, who gets to vote, and who gets remembered.",
    "Then resistance. The five ways people make change when the people in charge won't listen.",
    "Now November: who was here before the Pilgrims, and who do we remember at our table.",
  ],

  threads: [
    {
      id: "decides",
      name: "Who decides?",
      text: "Somebody always decides. The question is who, and who gets a say.",
    },
    {
      id: "formula",
      name: "The formula",
      text: "Somebody wants the work done cheap. Somebody else pays for it.",
    },
    {
      id: "twotrue",
      name: "Two true things",
      text: "A person or a group can do something brave and something wrong. We hold both.",
    },
    {
      id: "uninvited",
      name: "Who wasn't invited?",
      text: 'Every holiday and every "we the people" leaves somebody out. We ask who.',
    },
    {
      id: "pushed",
      name: "Pushed down, then pushing",
      text: "People who get pushed down sometimes learn to push somebody else.",
    },
    {
      id: "resist",
      name: "Five ways to make change",
      text: "Speak up. Stop. Build. Protect. Use the rules.",
    },
  ],

  units: [
    {
      when: "Summer 2026",
      title: "East Palo Alto and the Ohlone",
      bigIdea:
        "The place we live has layers, and every layer had people who were here first.",
      facts: [
        "The Ohlone and Muwekma people lived on this land for thousands of years.",
        "Spanish missions and ranchers took the land in the late 1700s.",
        "Japanese American families grew flowers here until 1942, when the government forced them into camps during World War II.",
        "In the 1960s the Nairobi Movement built Black pride and Black-run schools. In 1968 people even voted on renaming the city Nairobi.",
        "In 1983 East Palo Alto voted to become its own city.",
      ],
      argued: "Who should get to decide what happens to a place?",
      made: "A six-step history lesson on jaiyesobo.com, a timeline, and a family conversation.",
      threads: ["decides", "uninvited"],
      status: "done",
    },
    {
      when: "Summer 2026",
      title: "Juneteenth",
      bigIdea:
        "Freedom was announced, but it took two and a half years to reach everyone.",
      facts: [
        "The Emancipation Proclamation took effect on January 1, 1863.",
        "On June 19, 1865, a Union general read the order in Galveston, Texas, telling enslaved people there they were free.",
        "Juneteenth became a national holiday in 2021.",
      ],
      argued:
        "Why would people keep the news of freedom from the people it belonged to?",
      made: "Jaiye reported the story like a journalist. Kemi made a color story.",
      threads: ["uninvited", "formula"],
      status: "done",
    },
    {
      when: "August",
      title: "Labor Day and the Porters",
      bigIdea:
        "A holiday is a country deciding who to remember. This one is about what a person's work is worth.",
      facts: [
        "Enslaved people worked in America for 246 years without pay.",
        "In 1894 Pullman workers went on strike. President Cleveland signed Labor Day into law on June 28, then sent troops to break the strike on July 4. In that order.",
        "That same month, the railway union voted to keep Black workers out.",
        "In 1925, Pullman porters started their own union, the Brotherhood of Sleeping Car Porters, led by A. Philip Randolph. They won a contract in 1937, after twelve years.",
      ],
      argued:
        "Should Labor Day be in September, or on May 1 like most of the world?",
      made: "Jaiye's first opinion column. Kemi's four-word sign and a story about a porter's day. An interview with an elder about their first job.",
      threads: ["formula", "pushed", "uninvited", "resist"],
      status: "done",
    },
    {
      when: "September",
      title: "The Same Fight",
      bigIdea:
        "America was started by people who didn't want to be owned, and then it owned people.",
      facts: [
        "The colonists fought England over taxes they had no say in.",
        'In 1776 the Declaration said "all men are created equal." Thomas Jefferson, who wrote it, enslaved about 600 people in his life.',
        "Congress cut Jefferson's paragraph against the slave trade before they signed.",
        "After 1865, sharecropping kept freed families in debt. The landowner kept the book, and it never balanced.",
        "Children worked in factories. Workers learned three words: union, strike, contract.",
      ],
      argued: "Was the Declaration a lie, or a promise nobody had kept yet?",
      made: "Four turn-and-talk stops and a quiz on the screen.",
      threads: ["formula", "twotrue", "pushed", "resist"],
      status: "done",
    },
    {
      when: "October",
      title: "Who Decides?",
      bigIdea:
        "Politics is how a lot of people decide things together, and nobody decides alone.",
      facts: [
        "Cities decide parks, streets, and police. States decide schools and licenses. The nation decides money, the army, and laws for everyone.",
        "Congress makes the laws, the President runs things, and the courts say what's fair. Each one can stop the others.",
        "Black men got the right to vote in 1870, then states blocked them with tests, fees, and threats for almost 100 years.",
        "In 1965 marchers were beaten on a bridge in Selma. That August, the Voting Rights Act became law.",
      ],
      argued: "How much should one person get to decide?",
      made: "Questions for the people running for city council, a mock press conference, and signs.",
      threads: ["decides", "uninvited", "resist"],
      status: "done",
    },
    {
      when: "October 8",
      title: "Who Gets a Holiday?",
      bigIdea:
        "A holiday is a country deciding who to remember. October's Monday has two names.",
      facts: [
        "Columbus landed in 1492 where the Taíno already lived. That first night he wrote that they would make good servants.",
        "When the Taíno were dying, Spain brought enslaved Africans to the same island, starting around 1502. That's where Black history in the Americas begins.",
        "The first Columbus Day, in 1892, told Italian Americans they belonged, after a mob killed eleven Italian men in New Orleans.",
        "Berkeley started Indigenous Peoples' Day in 1992.",
      ],
      argued:
        "What should October's Monday be called: Columbus Day, Indigenous Peoples' Day, or both?",
      made: "Jaiye's column taking a side. Kemi's story about a Taíno kid on the beach. A monument to somebody the country should remember.",
      threads: ["uninvited", "formula", "twotrue", "pushed", "decides"],
      status: "done",
    },
    {
      when: "October 15",
      title: "The Black Panthers",
      bigIdea:
        "There's more than one way to resist. The Panthers tried almost all of them.",
      facts: [
        "Huey Newton and Bobby Seale started the Black Panther Party in Oakland on October 15, 1966. We learned it on the 60th anniversary.",
        "Their Ten-Point Program asked for schools that teach Black people's true history.",
        "They watched the police. When they carried guns into the State Capitol in 1967, California changed the law.",
        "In 1969 they started Free Breakfast for Children. The head of the FBI called it the greatest threat to stopping them.",
        "They fed thousands of kids, and some Panthers also did violent and wrong things. Both are true.",
      ],
      argued: "The guns or the breakfast: which did more to help Black people?",
      made: "We served a Panther breakfast to the family. Jaiye wrote about the Panthers' most powerful weapon. Kemi drew what kids here need.",
      threads: ["resist", "twotrue", "decides"],
      status: "done",
    },
    {
      when: "October 29",
      title: "Count Me In",
      bigIdea:
        "A vote is a regular person getting a turn to decide. People fought hard to keep it from others because it's powerful.",
      facts: [
        "Congress is 435 in the House and 100 in the Senate. A midterm is halftime in the President's term.",
        "A bill goes through the House, the Senate, and the President before it becomes a law.",
        "Women won the vote in 1920, but most Black women in the South were blocked until 1965.",
        "In 1971 the voting age dropped to 18.",
        "Our ballot on November 3 had all three levels: Congress, the governor, and our city council.",
      ],
      argued: "It's just one vote. Does it matter?",
      made: "A family voter guide, I Voted stickers, a poster for the window, and our song, Count Me In.",
      threads: ["decides", "uninvited", "resist"],
      status: "done",
    },
    {
      when: "November",
      title: "Who Do We Remember?",
      bigIdea:
        "Three weeks on Thanksgiving: who was here first, what really happened in 1621, and two ways to remember the same day.",
      facts: [
        "Nov 5: Who Was Already Here?",
        "Nov 12: What Really Happened in 1621",
        "Nov 19: Two Ways to Remember",
        "Nov 26: We lead the Thanksgiving table",
      ],
      argued: "",
      made: "",
      threads: ["uninvited", "twotrue"],
      status: "next",
    },
  ],
};
