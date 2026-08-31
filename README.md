# Messy-UI

A collection of animated React components built with GSAP and Framer Motion.

## Overview

Messy-UI is my take at making react components, since I was feeling a bit creative. I really wanted to try out creative programming and create a kind of a list of all the reusable cool looking components I make throughout my journey, also I needed a project for my CS classes therefore I finally decided to create this library.

## Why the name Messy-UI?

Even though I have not really watched football a lot and keeping aside of the fact I only know Lionel Messi and Ronaldo as the only two names in football. This name might seem stupid to a lot of people to name the library Messy-UI from even SEO point of view. Messy here only really represents my messy thoughts and this name came as a result of names we were throwing in a group discussion while trying to decide what should this library be named.

> This library has a lot of AI generated code and parts and I am actively trying to reclaim it all.

## Why use AI in something that's supposed to be for learning?

Since I am a CS student as of making this library, I think I am not worthy enough to comment on any of this whether AI is bad or not and whether we should use it or not. I do have my certain points here.

If I had never used AI this repo would have never existed because I spent almost 1/2 year trying to find the best way to create a centralized component preview that can essentially hold 2 types of components:

1. **Inline** - These are the one off components that are independent by nature from any other component on website. These can be called atomic components or dumb components depending on how old you are.
2. **Sandboxed** - These are the components that thrive in a whole website like environment, they have very specific use cases and are generally dependent on the whole website and their respective position throughout the website.

I think AI did a good job in making this code and it can most certainly support most of the creative ideas I get.

So, I let you the reader be the judge, should I've used AI in this?

## The PDF toolkit

Alongside the component library, this repo hosts a complete PDF editor at
[`/pdf`](https://messyui.dev/pdf) that runs **entirely in the browser**. There
is no upload endpoint and no server-side processing — the file never leaves the
device it is opened on. You can disconnect from the network after the page
loads and everything still works.

What it does:

| Area     | Features                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Pages    | Merge, split, extract, reorder, rotate, duplicate, delete, insert blank                                   |
| Annotate | Text, freehand ink, highlight, shapes, arrows, images, sticky notes, links, whiteout                      |
| Redact   | Genuine redaction — affected pages are rasterised so the text underneath is destroyed, not merely covered |
| Sign     | Draw, type or upload a signature, plus real cryptographic PKCS#12 signing and signature verification      |
| Forms    | Detect, fill and flatten AcroForm fields                                                                  |
| Security | Set or remove a password, set permissions, strip metadata, sanitise                                       |
| Convert  | PDF to PNG/JPG, images to PDF, extract text, compress at three tiers                                      |
| OCR      | Self-hosted Tesseract adds an invisible text layer, making scans searchable                               |

Two things it deliberately does **not** do, because they cannot be done
honestly client-side: validate a signature's trust chain against AATL or the EU
trusted lists (that needs network calls we do not make), and arbitrary in-place
text editing of existing content (subset fonts and reflow make this unreliable
— it offers whiteout-and-retype instead, and says so).

Every runtime asset, including the pdf.js worker and the Tesseract WASM core
and language model, is served from this origin rather than a CDN. Fetching
decoders from jsDelivr while claiming the document never leaves your device
would be dishonest.

### Licensing

The PDF toolkit is **not** MIT licensed. It is source-available: free to read,
run and use at messyui.dev, with a commercial licence required to ship it
inside a product. See [`LICENSE-PDF`](./LICENSE-PDF). Everything else in this
repository, including the component registry, is MIT — see
[`LICENSE`](./LICENSE).

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/messy-ui.git
cd messy-ui

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The development server will start at `http://localhost:3000`.

## Using Components

### Via shadcn CLI (Recommended)

You can add components directly to your project using the shadcn CLI:

```bash
npx shadcn@latest add https://messyui.dev/r/animated-counter.json
npx shadcn@latest add https://messyui.dev/r/hold-button.json
```

### Manual Installation

1. Visit the component documentation page
2. Copy the component code from the "Code" tab
3. Install any required dependencies
4. Add the component to your project

## Project Structure

```
messy-ui/
├── public/
│   └── r/                    # Generated registry JSON files
├── registry/
│   └── new-york/             # Component source files
│       ├── animated-counter/
│       └── hold-button/
├── scripts/
│   └── build-registry.ts     # Registry build script
├── src/
│   ├── app/                  # Next.js app router pages
│   ├── components/           # UI and layout components
│   ├── config/               # Component configuration
│   └── lib/                  # Utility functions
└── registry.json             # shadcn registry index
```

## Scripts

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `pnpm dev`            | Start the development server    |
| `pnpm build`          | Build for production            |
| `pnpm start`          | Start the production server     |
| `pnpm lint`           | Run ESLint                      |
| `pnpm registry:build` | Build the shadcn registry files |

## Building the Registry

To regenerate the component registry after adding or modifying components:

```bash
pnpm registry:build
```

This will:

1. Read all component directories in `registry/new-york/`
2. Generate individual JSON files in `public/r/`
3. Update the `registry.json` index file

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.
