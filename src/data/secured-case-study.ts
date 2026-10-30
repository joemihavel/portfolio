export type CaseStudyBlock =
  | { type: "paragraph"; html: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "link"; label: string; href: string };

export interface CaseStudyStory {
  title: string;
  summary: string;
  details: { label: string; value: string }[];
  sections: { id: string; label: string; title: string; blocks: CaseStudyBlock[] }[];
}

const p = (html: string): CaseStudyBlock => ({ type: "paragraph", html });
const h = (text: string): CaseStudyBlock => ({ type: "heading", text });

export const securedStory: CaseStudyStory = {
  title: "Secured — Designing for Growth",
  summary: "How we improved adoption and onboarding for a new rent payment product, growing the waitlist by 3.3× and monthly rent processed by 8×.",
  details: [
    { label: "Role", value: "Sole Product Designer · Website Design & Development" },
    { label: "Team", value: "1 Product Designer, 1 Visual Designer, 1 Engineer" },
    { label: "Timeline", value: "Jan – Mar 2026" },
  ],
  sections: [
    {
      id: "launch", label: "01 / The launch", title: "01 / A new product, three weeks to launch",
      blocks: [
        p("Flent Secured is a rent payment platform that gives tenants 1% cashback for paying rent on time, while landlords get free rental protection of up to ₹1.5 lakh."),
        p("For Flent, it was also a way to build direct relationships with tenants and landlords, rather than relying entirely on brokers and listing platforms."),
        p("We had a pre-Series A announcement coming up, and Secured was one of the products we wanted to launch alongside it. The catch was that we had just three weeks to get something out."),
        p("We started with a waitlist app to gauge interest, followed by another three weeks to build out the experience. Since rent payments happen monthly, missing that window meant potentially waiting another month before users could make their first payment."),
        h("What I owned"),
        p("I was the sole product designer, working closely with the founders on scoping, designing the app, and building the website. After V1, I worked with CX to understand where users were struggling and with engineering to refine V2 during implementation."),
      ],
    },
    {
      id: "adoption", label: "02 / The adoption gap", title: "02 / People were interested. Getting them to use it was harder.",
      blocks: [
        p("The first launch brought in over 200 waitlist signups on day one, with very little marketing spend."),
        p("The 1% cashback was an easy hook. People were already paying rent every month, so getting something back made sense."),
        p("But once users started onboarding, we noticed a few problems."),
        { type: "list", items: [
          "<strong>55% dropped off</strong> before uploading their rental agreement.",
          "People didn't understand why we needed their documents.",
          "Manual verification and approval delays left users unsure of what was happening.",
          "Some assumed Secured was only for people living in Flent homes.",
        ] },
        p("For someone already paying rent through UPI, we were asking them to install another app, sign up, upload an agreement, and wait for approval."),
        p("And we weren't explaining the process particularly well."),
        h("What did we need to fix?"),
        p("After reviewing feedback with CX and looking at the onboarding journey, we narrowed our focus to two goals."),
        p("<strong>Comprehension:</strong> Help users understand the product, verification requirements, and what happens next."),
        p("<strong>Adoption:</strong> Reach more relevant renters and make it easier for them to get started."),
        p("There was a business constraint too. We needed enough rent payments going through Secured to make the payment gateway economics work."),
        p("So the goal wasn't just to grow the waitlist. <strong>We needed more people to make their first successful rent payment.</strong>"),
      ],
    },
    {
      id: "journey", label: "03 / The journey", title: "03 / Looking at the journey differently",
      blocks: [
        p("Before designing anything, I went back to how people were discovering Secured."),
        p("Our main touchpoints were social media, physical events, merchandise, and the website. Most of these eventually led to the App Store."),
        p("<strong>Discover → Install → Sign up → Upload agreement → Waitlist</strong>"),
        p("Looking at this, I realised we were asking people to do quite a bit before we could even capture their interest."),
        p("Someone could visit our website, understand the product, and leave without signing up. Even after installing the app, they still had to complete several steps before joining the waitlist."),
        p("Two opportunities stood out."),
        p("<strong>Before the app:</strong> Could we capture interest and identify eligible renters earlier?"),
        p("<strong>Inside the app:</strong> Could we make onboarding easier to understand and reduce uncertainty?"),
        p("With a small team and a short timeline, we decided to focus on these opportunities rather than build entirely new acquisition channels."),
      ],
    },
    {
      id: "onboarding", label: "04 / Clearer onboarding", title: "04 / Making onboarding easier to understand",
      blocks: [
        h("The problem wasn't just uploading a document. It was understanding why."),
        p("One of the biggest drop-offs in V1 happened before users uploaded their rental agreement. From CX feedback, people weren't clear about why we needed it or what happened after submission."),
        p("In V1, verification was manual. Users would upload their agreement and wait, with little visibility into its status."),
        p("For V2, I added more context before the upload, explaining why we needed the document and what it would be used for. We also linked to relevant regulatory information for users who wanted to know more."),
        p("Alongside this, we introduced an automated parser that extracted agreement details and checked them against our eligibility criteria. I designed the experience to make the verification status visible instead of leaving users wondering what was happening."),
        h("Did it work?"),
        p("After launch, the CX team followed up with the same set of users. We saw a <strong>40% reduction in questions about why the rental agreement was needed.</strong>"),
        p("That was encouraging. The additional context seemed to help, but it wasn't a complete fix. Some users still needed clarification."),
      ],
    },
    {
      id: "eligible-renters", label: "05 / Eligible renters", title: "05 / Turning the website into a way to find eligible renters",
      blocks: [
        h("We were sending everyone to the app before knowing whether they were a good fit."),
        p("While mapping the discovery journey, I noticed the website was already doing a lot of the work of explaining Secured."),
        p("But we still asked people to download the app before learning much about them."),
        p("So I created an interactive map showing neighbourhoods across Bangalore. Users could find their building, enter their rent amount and BHK configuration, and check whether they were eligible for Secured."),
        p("We could have used a regular waitlist form. It would have been quicker to build, but wouldn't have given us the same property-level context."),
        p("The map also made the experience more relevant. Instead of filling out another lead form, people were checking whether Secured was available for their home."),
        h("Did it work?"),
        p("During V2's launch week, the map generated <strong>around 15 qualified leads</strong> who signed up quickly through invite codes."),
        p("That group accounts for approximately <strong>25% of our current active users</strong>."),
        p("For something we'd built to capture better-qualified interest before app installation, this was a promising result."),
      ],
    },
    {
      id: "shipping", label: "06 / Shipping decisions", title: "06 / A few other decisions that helped us ship",
      blocks: [
        p("Not everything needed a complete redesign. Some decisions were about making better use of what we already had, or deciding what could wait."),
        h("Keeping the landlord experience lean"),
        p("We initially considered a fuller landlord experience with payment history, assurance details, and a dashboard."),
        p("But when we broke down why landlords needed Secured, the immediate need was smaller: understand the product and complete the verification required to receive payments."),
        p("Around 80% of payments were through UPI, with 20% through credit cards. Given the timeline, we prioritised the landlord onboarding needed for the credit-card flow."),
        p("Tenants could invite landlords to a page explaining Secured and its benefits. I worked with marketing on the content, and landlords could then verify their phone number, confirm bank details, and complete the required onboarding."),
        p("We left the full self-service experience for later. That gave us more time to focus on the tenant journey."),
        h("Making the waitlist more useful"),
        p("Instead of ending onboarding with a generic confirmation, we showed the waitlist count and what users could expect once they were approved."),
        p("Since we were rolling out to a limited number of users, this helped explain the wait and kept the benefits visible."),
        h("Using invites and referrals"),
        p("We introduced invite codes to manage access and reach renters in targeted residential communities. I worked with marketing on the collaterals, which were also distributed offline at selected buildings."),
        p("We also introduced referrals, hoping existing users would help us reach other renters."),
        p("But referrals gave us an interesting learning."),
        p("<strong>Only around 10% of referred users qualified for Secured.</strong> Even with a good incentive, we didn't see as much participation as we'd hoped."),
        p("Looking back, we underestimated how much eligibility affected referrals. People could recommend Secured to friends, but that didn't mean those friends would qualify."),
      ],
    },
    {
      id: "results", label: "07 / Results", title: "07 / What changed?",
      blocks: [
        p("After V2, we saw growth in both the waitlist and monthly rent processed."),
        { type: "table", headers: ["Metric", "V1", "V2", "Change"], rows: [
          ["Waitlisted users", "~300", "~1,000", "+233.3%"],
          ["Monthly rent processed", "~₹5L", "~₹40L", "+700%"],
        ] },
        p("We later reached around 2,000 lifetime waitlisted users, with roughly 60 monthly active rent payers."),
        p("These results came from a combination of product changes, marketing, acquisition, and operational improvements. I wouldn't attribute all the growth to design alone, but V2 addressed several of the problems we'd identified after the first launch."),
      ],
    },
    {
      id: "personal-wins", label: "08 / Personal wins", title: "08 / A few personal wins",
      blocks: [
        p("Beyond the product and growth work, there were a few things I was particularly happy to have shipped."),
        h("A new design language"),
        p("Between V1 and V2, I revamped the design language based on early stakeholder feedback, revisiting typography, colours, components, and the overall visual direction."),
        p("And yes, I designed dark mode too. :p"),
        h("Design tokens for AI-assisted implementation"),
        p("I built a design token library to help carry our design decisions into frontend development."),
        p("With AI becoming part of how we built the product, I wanted a more consistent way to define colours, typography, and other design properties instead of repeatedly correcting them during implementation."),
        h("Designing and building the website"),
        p("I designed and built the Secured website, working across the visual direction, storytelling, interactions, and frontend implementation."),
        p("It had to explain a new product, make the benefits easy to understand, and give tenants and landlords a clear way to get started."),
        { type: "link", label: "Live website", href: "https://flent.in/secured" },
      ],
    },
    {
      id: "reflection", label: "09 / Looking back", title: "09 / Looking back",
      blocks: [
        p("Getting Secured launched and getting people to use it turned out to be two different problems."),
        p("V1 was about shipping within a very short timeline. V2 was about understanding what wasn't working and figuring out where to spend our effort."),
        p("Some decisions worked better than others. The agreement changes reduced confusion but didn't eliminate it. The website map brought in qualified users, while referrals showed us that reaching more people didn't necessarily mean reaching the right people."),
        p("What stayed with me was how much of the work came down to prioritization."),
        p("With a small team and limited time, <strong>deciding what not to build mattered just as much as deciding what to build.</strong>"),
      ],
    },
  ],
};
