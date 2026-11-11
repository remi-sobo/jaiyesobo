@AGENTS.md

## Working efficiently

- Match the effort to the job. A small, scoped change needs no plan and no subagents. For anything touching more than three files, list the files and the change in each before editing.
- Finding code: when the answer needs more than a few file reads, use the built-in Explore agent and ask for paths plus a short summary.
- Checks: hand lint, types, tests and builds to the `checker` agent. It reports failures only.
- Review: run the `reviewer` agent once on the diff before opening a PR.
- Media: run FFmpeg, video builds and transcription through the `video-build` agent. Never read a full transcript, frame dump or FFmpeg log into the main conversation; search for the part you need.
- No agent teams or parallel workflows unless Remi asks for them.
- Keep reports short: what changed, what was verified, what is still open.
