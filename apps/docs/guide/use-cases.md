# Use cases

monkbrowse lets an AI assistant (Claude, Cursor, VS Code, Windsurf) drive **your real, logged-in Chrome**. Not a fresh throwaway browser: the actual one where you are already signed in to your email, your dashboards, your bank, your internal tools. You pick which tabs it can touch, and it works inside your real session (cookies, 2FA, your normal fingerprint). Nothing gets relaunched.

Because it reuses your session, it can do things a headless bot cannot: reach pages behind a login, keep your place, and act as you across many tabs and even several Chrome profiles at once.

## Read and research across tabs

- "Summarize the five articles I have open and tell me which one actually answers my question."
- "Compare the pricing on tab 2 and tab 3 and put it in a table."
- "Pull the key points from this long thread and draft a reply."

The AI reads the page the way a screen reader does (an accessibility snapshot), so it understands structure, not just raw text.

## Fill forms and run repetitive flows

- "On tab 1, fill this job application with the details from my resume."
- "Go through this admin panel and archive every closed ticket."
- "Book the slot on this calendar page for next Tuesday at 3pm."

You stay in control: it only acts on tabs you shared, and you watch it happen in your own window.

## Everyday ops behind a login

- "Check my order status on this page and tell me if it shipped."
- "Download this month's invoices from the billing dashboard."
- "Reply to the top three comments on this post."

These all need your logged-in session. That is exactly what monkbrowse gives the AI, without you pasting passwords anywhere.

## Web development and testing

- "Open localhost:3000, click through the checkout, and tell me what breaks."
- "Take a screenshot of this page at the current state."
- "Read the console logs on this tab and explain the error."

It is a fast way to let the AI poke at something you are building, in the same browser you are building it in.

## Work across several Chrome profiles at once

This is the part most tools cannot do. If you run separate Chrome profiles (say **Work** and **Personal**), each one connects on its own port, and a single AI session can drive **both at the same time** without one kicking the other off.

- "In my Work profile, grab the meeting notes; in Personal, add the follow-ups to my todo list."
- "Cross-check the same order in the customer's account and my admin account."

See [Connections & profiles](/guide/connection) for how a profile maps to a port, and why.

## What it is not for

- It is not a hidden background bot. You see every action in your own browser, and it can only touch tabs you explicitly shared. See [Sharing tabs](/guide/sharing).
- It is not a scraper farm. It drives one real browser as you, not thousands of anonymous sessions.

## Next

- New here? Start with [Get started](/guide/getting-started).
- Want the full list of what the AI can do? See the [Tool reference](/guide/tools).
