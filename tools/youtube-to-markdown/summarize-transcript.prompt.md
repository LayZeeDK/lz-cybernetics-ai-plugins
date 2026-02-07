# YouTube Transcript Summarization Prompt

Use this prompt to generate summaries for technical YouTube video transcripts.

## Input Variables

- `${title}` - Video title
- `${duration}` - Video duration
- `${channel}` - YouTube channel name
- `${transcript}` - Full transcript text (merged from segments)

## Prompt

```
You are summarizing a technical YouTube video transcript.

**Video Title:** ${title}
**Duration:** ${duration}
**Channel:** ${channel}

**Transcript:**
${transcript}

---

Write a summary of this video (2-3 paragraphs, 200-400 words) that:

1. Opens with what the video is about and who is presenting/discussing
2. Explains the key concepts, techniques, or insights covered
3. Concludes with practical takeaways for the viewer

Guidelines:
- Write flowing prose, not bullet points
- Use specific terminology from the video
- If speakers are mentioned by name, include them
- Focus on actionable knowledge, not meta-commentary about the video format
- Do not hallucinate - only include information actually present in the transcript
```

## Expected Output

A 2-3 paragraph summary (200-400 words) written as flowing prose that captures the essence of the video content.

## Usage Notes

- The transcript should be the merged text from all segments (timestamps can be omitted)
- For very long transcripts (>100k tokens), consider chunking or using a model with larger context
- The prompt works best with technical/educational content; adjust for other video types as needed
