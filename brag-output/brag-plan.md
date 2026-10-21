# SchemeSetu launch video: plan

Draft 1, 2026-10-15. Voiceover on (requested). Output folder: `brag-output/`. Nothing here is committed.

## The nine questions

1. **What is it?** A website that lists 4,722 Indian government schemes and shows which ones fit the person who is looking.
2. **Who is it for, and what does it do for them?** Citizens who do not have time to read hundreds of scheme pages. They answer a few questions and get a short list.
3. **What sets it apart?** A blank answer means "unknown", and unknown never removes a scheme. The whole eligibility engine is built on that one idea.
4. **Most impressive claim (true ones only):** 4,722 schemes, 36 states and union territories, English and Hindi, 963 automated tests.
5. **Visual hook:** the number 4,722, very large, flush left, with one red full stop.
6. **Real UI or code to show:** real lines from `backend/src/utils/criteriaMatch.ts`, the "Show more" list, a Hindi scheme card.
7. **Tone:** `polished`, with a freeform direction: minimalism and Swiss design.
8. **One-line share caption:** "4,722 schemes. A few questions. The ones that fit you."
9. **Angle:** *Ideas, written as code.* Brainstorm notes appear as plain Swiss index cards, and each one turns into the code line that makes it true.

## Interpretation to confirm

"Focus on the code and the idea of the brainstorming of the ideas" is read as: show the design ideas behind the product as short notes, then show each note becoming a real code line. If you meant something else (for example the development process itself), say so and I will change the middle scenes.

## Visual identity (minimalism plus Swiss design)

- Background off-white `#F4F2EE`, text black `#111111`, one accent: Swiss red `#E3000F`. No gradients, no shadows, no icons.
- One grotesque typeface (Helvetica Neue or Arial from the system, Inter if available) in two weights: Bold for numbers and titles, Regular for notes.
- Monospace (Consolas or Menlo) only for real code.
- A visible 12-column grid. All text is flush left. Large numerals. Thin black rules (2 px) divide the frame.
- Motion: straight lines only. Text and rules slide in on the grid, with short ease-out moves. Cuts are hard, or a wipe along a rule.
- Format: landscape 1920x1080, 30 fps.

## Voice

Kokoro (through Hyperframes), one calm voice, plain pace. The narration adds meaning and does not read the screen text.

### Script rules applied
- ASD-STE100 style: one idea in each sentence, active voice, simple present tense, plain words, no idioms, no phrasal verbs that have a plain verb, sentences of 3 to 20 words.
- Rhythm varies on purpose: short sentences (3 to 5 words) next to longer ones (15 to 20 words), and a natural, slightly rambling thread of thought.
- No "not X but Y" lines and no either/or constructions. Every sentence states what is true.
- Only true facts. No invented users, prices or web address.

### Narration

| Scene | Voice |
|---|---|
| 1 Hook | "India has 4,722 government schemes." |
| 2 Question | "Nobody reads all of them. A person needs only the ones that fit. So we started with one question." |
| 3 Ideas to code | "Every idea starts as a note. A blank answer means unknown, and unknown keeps the scheme in the list. The note becomes one line of code." |
| 4 Result | "You see twenty schemes at a time, in English and in Hindi." |
| 5 Outro | "SchemeSetu. Find the schemes that fit." |

About 72 words. At a calm 3 words per second this is 24 seconds, so the video runs 25 seconds, the upper limit. Scene timings follow the recorded voice.

## Storyboard (landscape, total 25 seconds)

| # | Time | Scene | On screen | Motion and transition | Sound |
|---|---|---|---|---|---|
| 1 | 0.0 to 3.0 | Hook | `4,722` at 520 px bold black, flush left, red full stop. Small caption in regular weight: "government schemes in India" | The numeral counts up from 0 in 1.0 s, settles, the red full stop drops in last. | Soft tone, a quiet tick for the count |
| 2 | 3.0 to 8.5 | Question | Black text, 160 px: "Which schemes fit you?" Words appear one by one on the left. A thin red rule grows under the text. | Words slide in from the left edge, 0.2 s apart. Rule grows after the last word. Hard cut. | Single soft key, no beat |
| 3 | 8.5 to 18.0 | Ideas to code | Left column: three index cards stacked on the grid, each with a small number (01, 02, 03) and one note in Regular: **01** "A blank answer means unknown." **02** "Occupation changes the order. It never removes a scheme." **03** "Each page of results has no repeats." Right column: monospace code that appears beside the active card, taken from the real files (see below). The active card gets a red left bar. | Cards enter one at a time (0.4 s). When a card is active, its code types in over 1.2 s. Hold 1.4 s after each. | Light key clicks while code types, very quiet |
| 4 | 18.0 to 22.0 | Result | The real list look: three scheme titles in a plain list (English line, Hindi line below each), a "Show more" label, and "20 at a time" in red. | Rows slide in 0.15 s apart. | Soft rise |
| 5 | 22.0 to 25.0 | Outro | `SchemeSetu` bold, 220 px, with the red full stop. Under it: "Find the schemes that fit." Small footer line: "4,722 schemes / 36 states and territories / English and Hindi". | Text locks onto the grid. Hold 2 s. | Music resolves, single low note |

### Real code shown in scene 3 (copied from the repository, trimmed for the screen)

- Card 01, `criteriaMatch.ts`: an unknown result, `status: 'unknown'`, with the comment that unknown never excludes a scheme.
- Card 02, `criteriaMatch.ts`: `soft: true` on the occupation result.
- Card 03, `routes/schemes.ts`: `const MAX_RECOMMENDED_LIMIT = 50;` and `hasMore: page * limit < total`.

The lines will be copied from the files at build time. No secrets, no personal data. Scheme names on screen are real names from the public catalogue.

## Music and sound

Quiet, sparse, minimal piano or soft synth, about 70 bpm, with a single low resolve at the end. Sound effects are soft ticks and key clicks, in the same key as the music, mixed under the voice. The voice sits on top and the music ducks about 10 dB when it speaks.

## Share copy (draft)

"4,722 government schemes, a few questions, and the ones that fit you. SchemeSetu starts every idea as a short note and turns it into code. English and Hindi."

## Open points before the build

1. Install the voice engine (Kokoro through `pip install kokoro-onnx soundfile`, plus its model download). Needs your approval.
2. Confirm the reading of "brainstorming the ideas" (see above).
3. Chrome for rendering: the Hyperframes check could not start the installed Chrome (it timed out). The build will test it again and fall back to Hyperframes' own browser download if needed (needs your approval).
