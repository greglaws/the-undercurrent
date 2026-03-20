# The Undercurrent

**[View the gallery](https://greglaws.github.io/the-undercurrent/)**

A daily AI-generated artwork that interprets the collective mood beneath American news headlines. Each day, front-page headlines from six major newspapers are gathered over a rolling seven-day window, then fed to an AI image model that produces a single symbolic, surrealist composition — no text, no literal depictions, just a visual reading of what lies between the lines.

## How it works

1. **Headlines are collected** from The New York Times, The Washington Post, The Wall Street Journal, Los Angeles Times, NPR News, and PBS NewsHour via their RSS feeds.
2. **A generative prompt** combines those headlines with compositional direction — asking for symbolic interpretation, not illustration.
3. **An AI image model** (Google Gemini / Imagen) generates the artwork.
4. **A GitHub Actions workflow** runs this process daily and commits the result to the archive.

The site is a static gallery served via GitHub Pages. Previous works are preserved and viewable by scrolling.

## Contributing

Pull requests are welcome — especially to refine the generative prompt or improve the site. If you have an idea for how the prompt could produce more interesting or evocative results, open a PR and let's talk about it.

All contributions are reviewed before merging. The generation runs on a hosted API key, so changes to the prompt or pipeline go through review to keep things safe and intentional.

### To run locally

```bash
npm install
cp .env.example .env  # Add your own GEMINI_API_KEY
node scripts/daily-update.js
```

## License

- **Code** — [MIT License](LICENSE) — fork it, riff on it, make your own thing.
- **Artworks** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share and remix with attribution.
