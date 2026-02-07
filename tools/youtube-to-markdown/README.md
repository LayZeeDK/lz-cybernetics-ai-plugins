# youtube-to-markdown

YouTube transcript extractor using the InnerTube API. No browser needed.

## Prerequisites

- Node.js LTS

## Installation

```bash
npm install
```

## Usage

### Extract transcript to Markdown

```bash
# By video ID
npm run transcript -- SB6cO97tfiY

# By URL
npm run transcript -- "https://www.youtube.com/watch?v=SB6cO97tfiY"

# Also save intermediate JSON
npm run transcript -- SB6cO97tfiY --json

# Custom output prefix
npm run transcript -- SB6cO97tfiY --output my-video
```

### Convert existing JSON to Markdown

```bash
npm run to-markdown -- path/to/transcript.json
```

## Output format

```json
{
  "videoId": "SB6cO97tfiY",
  "url": "https://www.youtube.com/watch?v=SB6cO97tfiY&hl=en",
  "title": "Video Title",
  "channelName": "Channel Name",
  "channelUrl": "https://www.youtube.com/channel/...",
  "duration": "48:40",
  "description": "Video description...",
  "aiSummary": null,
  "chapters": [
    { "timestamp": "0:00", "title": "Introduction" }
  ],
  "transcript": [
    { "timestamp": "0:00", "text": "Transcript segment text..." }
  ]
}
```

The Markdown output groups transcript text into readable paragraphs under chapter headings with timestamped YouTube links.

## Scripts

| Script | Purpose |
|--------|---------|
| `youtube-to-markdown.mjs` | Fetch metadata + transcript via InnerTube API, output Markdown |
| `transcript-to-markdown.mjs` | Convert JSON transcript to Markdown (also usable as library via `generateMarkdown` export) |

## Other files

| File | Purpose |
|------|---------|
| `summarize-transcript.prompt.md` | Prompt template for AI-assisted transcript summarization |
| `utils/video-id.mjs` | Extract YouTube video ID from URL or raw ID |
| `utils/filename.mjs` | Sanitize strings for cross-platform filenames |

## Limitations

- No AI summary (requires authenticated YouTube session)
- Chapter detection depends on uploader putting timestamps in the video description (YouTube's auto-generated chapters are not available via API)
