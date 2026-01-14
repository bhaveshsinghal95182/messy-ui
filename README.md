# messy-ui

A collection of animated, accessible React components built with GSAP and Framer Motion. Copy the code and make it yours.

## Overview

messy-ui is a component library featuring beautifully animated UI components designed for modern React applications. Each component is built with accessibility in mind and can be easily customized to fit your project's design system.

## Features

- Animated components using GSAP and Framer Motion
- Built with React 19 and Next.js 16
- Styled with Tailwind CSS v4
- Dark mode support via next-themes
- shadcn/ui compatible registry
- TypeScript support
- Accessible by default

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

## Available Components

### Animations

- **Animated Counter** - A number counter with odometer-style digit rotation animation using GSAP. Perfect for statistics, metrics, and dashboard displays.

### Buttons

- **Hold Button** - A confirmation button that fills up while being held, perfect for destructive or irreversible actions. Prevents accidental clicks by requiring a sustained press.

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

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
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

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [React 19](https://react.dev/) - UI library
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [GSAP](https://greensock.com/gsap/) - Animation library
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [shadcn/ui](https://ui.shadcn.com/) - Component primitives
- [Radix UI](https://www.radix-ui.com/) - Accessible primitives
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

MIT
