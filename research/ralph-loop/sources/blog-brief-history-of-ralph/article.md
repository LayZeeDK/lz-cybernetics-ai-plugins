# A Brief History of Ralph

> Source: [https://www.humanlayer.dev/blog/brief-history-of-ralph](https://www.humanlayer.dev/blog/brief-history-of-ralph)
> Author: Dex

---
The [Ralph Wiggum Technique](https://ghuntley.com/ralph/), created by [Geoff Huntley](https://x.com/GeoffreyHuntley), went viral in the final weeks of 2025. Here's the story of ralph since the first time I met Geoff in June of 2025.

I've been messing with ralph since ~June 2025. Here's my story and what I learned along the way.

**tl;dr**

Jan 1 2026 - If you wanna skip to the end, I did a deep dive on ralph w/ Geoff Huntley on Jan 1 2026. It talks through the history, cursed lang, and compares the original bash-loop ralph implementation with the anthropic stop-hook implementation. You can check it out here:

[![ralph-yt](https://img.youtube.com/vi/SB6cO97tfiY/0.jpg)](https://www.youtube.com/watch?v=SB6cO97tfiY)

### \### June 19th 2025

I attend a meetup with about 15 members of a Twitter GC where we talk about agentic coding. It's the first time I see context7, WisprFlow, specstory, taskmaster, and a whole bunch of other tools and addons, some of which are now quite mainstream. One of our engineers demos an early TUI for Claude approvals and what becomes the foundation of research / plan / implement.

There are about 3 hours of presentations. Geoff shows up 2 hours late and presents last. He completely steals the show, diving deep on ralph, cursed lang (at the time, the compiler stack is written in Rust), livestreaming autonomous coding overnight while asleep in Australia, subagents in amp code, the virtues of drinking 3 margaritas and shouting at cursor, and much, much more.

Geoff talks about the "overbaking" phenomenon. If you leave ralph running too long, you end up with all sorts of bizarre emergent behavior, like post-quantum cryptography support.

It has dimensions of art, deep engineering, the embrace of chaos, and the raw and authentic joy of making a thing.

All ~15 of us have a long and (imo) somewhat unsettling conversation about the future of software dev—about how easy it is to take a SaaS and copy 80-90% of it, and about how many types of work are about to change or disappear entirely.

### \### July 2025

Geoff Launches ralph in [an official blog post](https://ghuntley.com/ralph/).

![ralph-blog](https://www.humanlayer.dev/blog/brief-history-of-ralph/ralph-blog.jpg)

It includes the basic bash loop structure:

```
while :; do cat PROMPT.md | npx --yes @sourcegraph/amp ; done
```

I send it to everyone I know. I hint at it to a few others.

![escape](https://www.humanlayer.dev/blog/brief-history-of-ralph/text.jpg)

It includes a very lightweight example of one of the prompts (this one came later in the language dev, as far as I can tell, since its about the stdlib)

![prompt](https://www.humanlayer.dev/blog/brief-history-of-ralph/prompt.png)

At the time, it included an ask (paraphrasing here as it appears to be gone now)

> you could probably find the cursed lang repo on github if you looked for it, but please don't share it yet

This is exciting.

### \### August 2025 - Advanced Context Engineering for Coding agents

If you were early to the coding agents poweruser game, you might have seen [Getting AI to work in complex codebases](https://hlyr.dev/ace-fca) on hackernews and the [youtube talk it was based on](https://www.youtube.com/watch?v=IS_y40zY-hc&t=606s)

It references ralph and why its such an important example of why engineering your context window is such a high-leverage activity.

Ralph is also a great example of using declarative specifications over imperative instructions.

### \### August 2025 - hacking productivity tools

I love hacking on Getting Things Done (GTD) and other productivity systems. I for whatever reason am still stuck on omnifocus which is an ancient but well-honed implementation of the system. But I have always longed for an AI native version.

I wrote a half-pager on what I wanted, I had ralph write the specs from that, and I had another ralph build the implementation from the specs.

I didn't really read the specs, and I didn't read the code.

The output sucked. I went back to read the specs and they were way off base.

That's fine it was a saturday morning toy thing, but I learned stuff.

**Lessons**:

-   if the specs are bad, the results will be meh
-   if you don't actually know your desired end state workflows and how you will test it, you probably won't know what to do when its done
-   if you are iterating/exploring, you probably don't want ralph in the first place

### \### August 2025 - we put a coding agent in a while loop and it shipped 6 repos overnight

You may recall this HN discussion - [we put a coding agent in a while loop and it shipped 6 repos overnight](https://news.ycombinator.com/item?id=45005434) - here's the original post simon and I wrote up at [repomirrorhq/repomirror](https://github.com/repomirrorhq/repomirror/blob/main/repomirror.md)

### \### August 2025 - testing ralph for a refactor

I did a few experiments with ralph for side projects, but the most interestinng one was this one.

1.  An engineer was complaining that the frontend code was messy and was hard to work in, sprawling patterns, long components, etc
2.  I spent about 30 minutes back and forth with claude developing a [REACT\_CODING\_STANDARDS.md](https://github.com/humanlayer/humanlayer/pull/513/files#diff-5487b92720e928ed8ea977964b50e2aa06799655c363794f44b399db24aef042)
3.  I spent another 30 minutes working with the engineer (who has a lot more react experience than I do) to refine and update this doc
4.  I launched a ralph with a prompt "make sure the code base matches the standards" [prompt.md](https://github.com/humanlayer/humanlayer/pull/513/files#diff-53b6860818e438160467dd18325eb5213e411ea3622a567344f74a1e5e7a68ca)
5.  Over the next 6 hours, it developed a [REACT\_REFACTOR\_PLAN.md](https://github.com/dexhorthy/humanlayer/blob/75e29a84c8c9261ff5c4ca62d2212736e9be9f02/humanlayer-wui/REACT_REFACTOR_PLAN.md) and blasted through the whole thing
6.  I checked in after 6 hours and it claimed to be finished, so I stopped it and sent it over to team for a look.
7.  Overall the feedback was positive, but the PR quickly got some merge conflicts and so we never ended up merging it - you can [view the closed PR here](https://github.com/humanlayer/humanlayer/pull/513/files#diff-c63bc7049cdcb765ad6c4525336e5a0c6ce6b00f901e162da2b5e9c386af630c)

**Lesson** - code is cheap - the easier alternative to "merge/rebase" is just to re-run the ralph loop on the fresh code with the same prompt and re-open a PR.

**Lesson** - for existing codebases, make the change set manageable - we have since set up any ralph-ish desired state loops to once ONCE on a cron overnight, and merge small iterations over time. Waking up to one small refactor every morning is better than both a) waking up to none and b) waking up to 50.

See also: [Ron Jeffries: Refactoring -- Not on the backlog!](https://ronjeffries.com/xprog/articles/refactoring-not-on-the-backlog/)

### \### September 2025 - cursed lang launch

In September 2025, Geoff [launches cursed lang officially](https://ghuntley.com/cursed/), the programming language that ralph built. Once in C, once in rust, and then finally in zig. It has a standard library and a stage-2 compiler (cursed lang compiler written in cursed lang).

Check out the [Cursed Lang Homepage](https://cursed-lang.org/)

![cursed-lang](https://www.humanlayer.dev/blog/brief-history-of-ralph/cursed-lang.png)

**Aside** - I want to do a cursed lang hackathon next time Geoff is in SF - stay tune or ping me on X if this is something you're be interested in.

### \### October 2025 - Claude Anonymous SF

I did a 5-minute ralph presentation at [claude code anonymous](https://luma.com/i37ahi52) in sf, in a room full of some of the most creative and enterprising claude code and codex users in town. [steipete](https://x.com/steipete) came all the way out from Austria to co-host with the Sentry folks.

It's hard to capture the glory of ralph in a 5 minute lightning talk. But even if all the context engineering concepts get missed, its always a fun time because of the deep art Geoff put into it the naming and branding.

Highlight was a question from the audience "so do you recommend this?" - my answer: "well, I believe you should try everything". Perhaps the point is not the 5-line bash loop. Perhaps the point is **dumb things can work surprisingly well**, so what could we expect from a smart version of the thing?

### \### October 2025 - AI That Works w/ Geoff Huntley

I was annoyed that I couldn't really do ralph justice in 5 minutes, so I wrangled [Vaibhav](https://x.com/vaibcode) and [Geoff](https://x.com/GeoffreyHuntley) to do a 75-minute podcast deep diving on ralph and why it works.

We talk a lot about context windows, control loops, and various applications of the technique - refactoring, spec generation, new project setup, etc.

![ralph-whiteboard](https://www.humanlayer.dev/blog/brief-history-of-ralph/ralph-slides.png)

It was a fun time. You can watch it here:

[![aitw](https://img.youtube.com/vi/fOPvAPdqgPo/0.jpg)](https://www.youtube.com/watch?v=fOPvAPdqgPo)

[There's some code samples here](https://github.com/ai-that-works/ai-that-works/tree/main/2025-10-28-ralph-wiggum-coding-agent-power-tools)

### \### December 2025 - Anthropic Plugin Launches

At some point the anthropic team released an [official ralph wiggum plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum).

Many people tweeted at Geoff about it.

[![ralph-plugin](https://www.humanlayer.dev/blog/brief-history-of-ralph/ralph-plugin.png)](https://x.com/GeoffreyHuntley/status/1999722774403928218)

I test it out. I am disappointed. It dies in cryptic ways unless you have `--dangerously-skip-permissions`.

It installs hooks in weird places you can't find, uses a strange markdown file to track state, and adds an opaque stop hook for all claude sessions in a directory until you disable it. If you, in trying to stop it, delete the markdown file before stopping it, you break claude in that repo until you disable the plugin entirely.

Beyond that, it misses the key point of ralph which is not "run forever" but in "carve off small bits of work into independent context windows".

I look forward to see more from Anthropic on this in the future, but for now I'll keep my 5-line bash loops.

### \### December 2025 - Youtube Slop Everywhere

There were quickly ralph wiggum videos everywhere. Most of them are typical youtube ai hype-slop:

[![ralph-yt](https://www.humanlayer.dev/blog/brief-history-of-ralph/ralph-yt.png)](https://www.youtube.com/results?search_query=ralph+wiggum+claude)

I actually like [Matt Pockock's youtube overview](https://www.youtube.com/watch?v=_IK18goX4X8) because its true to the OG technique, and Matt does a good job of grounding the technique in a workflow like kanban, requirements discovery, etc.

### \### Jan 1 2026 - Ralph Wiggum Showdown

So much ralph hype, I decided to give the official plugin another shot. I posted this graphic on twitter:

[![ralph-tweet](https://www.humanlayer.dev/blog/brief-history-of-ralph/ralph-tweet.png)](https://x.com/dexhorthy/status/2006832274848047285)

To my pleasant surprise, Geoff texted me and was like "okay I can jump on for the first 30 minutes or so".

So here ya go, a bonafide ralph wiggum yap, the whole story, why it works, with whiteboards and live examples for a side project I'm working on called `kustomark`.

[![ralph-yt](https://img.youtube.com/vi/SB6cO97tfiY/0.jpg)](https://www.youtube.com/watch?v=SB6cO97tfiY)

Here's the repos that got built. I still haven't gotten around to evaluating which one, if any, actually solves my problem:

-   [https://github.com/dexhorthy/kustomark-ralph-bash](https://github.com/dexhorthy/kustomark-ralph-bash)
-   [https://github.com/dexhorthy/kustomark-ralph-plugin](https://github.com/dexhorthy/kustomark-ralph-plugin)

### \### What's next

I still need to do a deep dive on what was built on the showdown stream. That's coming in the next few days, hopefully, because the kustomark plugin is a thing I actually want+need for some projects we're exploring.

You should mess with this stuff. It's not exactly the future, but its an imporant slice through a bunch of important concepts that will make you a better Agentic Coder and a better AI Engineer.

### \### Okay one more thing

A gift and a shameless plug - a lot of you are sitting around on the waitlist wondering "when the heck is codelayer gonna actually launch". Quick update there - we're still working hard in the trenches with customers, and learning a lot that has led us to reexamine the entire product. However I am very proud of the OG codelayer and we have many many very happy users on the free private beta. So -- with the disclaimer that we will likely sunset the current beta in favor of a new thing we're launching soon -- if you read this far and you wanna try codelayer - check out the docs at [https://hlyr.dev/docs](https://hlyr.dev/docs) and have fun.

Excited to share what's next.

In the mean time, happy ralphing. Hurry up before it gets [semantically diffused](https://martinfowler.com/bliki/SemanticDiffusion.html).

\-dex

### \### PPS

We're hiring yada yada come build cool shit

### \### PPPS

i guess we have a meme coin now...pack it up y'all its over, see you for the next memetic mind virus

[![ralph-coin](https://www.humanlayer.dev/blog/brief-history-of-ralph/ralph-coin.png)](https://x.com/GeoffreyHuntley/status/2008142361344504162)
