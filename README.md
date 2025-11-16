# Important notes about the project:

- The IDE used to develop the project was JetBrains PHP Storm + Windsurf plugin (using Cascade for agents). Since it had
  issues recognizing files located in `.ai` folder when trying to @mention them, all the files are in `_ai` folder
  instead.
- Files in `.windsurf` folder apparently need to be `.md` to work properly (`.mdc` didn't)
- I am mainly a backend developer, though I have some experience with Vue/React and TS, but Astro was completely new to
  me. The goal I set here for myself was to make a deep dive into an unknown stack and try to make the project work as
  closely to as I wanted, without having to "manually" touch the code. So I believe it's safe to say 99.5% of the code
  is written by the agents. Does it work? It works! Is it well written? It works! :)

# StashTracker

A lightweight, personal web application that enables users to manually track everyday expenses and savings ("stashes")
in PLN. StashTracker focuses on simplicity, providing a simple, responsive browser-based interface.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

StashTracker is designed to help users maintain visibility over their discretionary spending and savings progress with
minimal friction. The application allows users to:

- **Track Expenses**: Set monthly budgets, record expenses with categories and amounts
- **Manage Stashes**: Create stashes, which can be a Savings Account, a Broker Account, a Crypto Wallet, etc. - add or
  remove funds, and track transaction history

The application uses a single currency (PLN) and focuses on manual data.

## Tech Stack

### Frontend

- **Astro 5** - Fast, efficient website and app framework with minimal JavaScript
- **React 19** - Interactive components where needed
- **TypeScript 5** - Static typing and enhanced IDE support
- **Tailwind CSS 4** - Utility-first CSS framework for styling
- **Shadcn/ui** - Accessible React component library
- **Lucide React** - Icon library

### Backend

- **Supabase** - Comprehensive Backend-as-a-Service
    - PostgreSQL database
    - Built-in user authentication
    - Open-source and self-hostable

### DevOps & Tooling

- **GitHub Actions** - CI/CD pipelines
- **DigitalOcean** - Application hosting via Docker
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit validation

### Runtime

- **Node.js** - v22.14.0

## Getting Started Locally

### Prerequisites

- Node.js v22.14.0 (use [nvm](https://github.com/nvm-sh/nvm) for version management)
- npm (included with Node.js)
- A Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stash-tracker
   ```

2. **Install Node.js version**
   ```bash
   nvm use
   ```
   This will automatically use the Node.js version specified in `.nvmrc`

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment variables**

   Copy the example environment file and configure it with your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your Supabase project details (URL, anon key, etc.)

   For end-to-end tests, duplicate the environment file and tailor values that differ for test runs:
   ```bash
   cp .env .env.test
   ```

   The Playwright configuration automatically loads `.env.test` when running the E2E suite.

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000` (or the port specified by Astro). Note: E2E tests use
   port `4321`.

## Available Scripts

| Script                    | Description                                              |
|---------------------------|----------------------------------------------------------|
| `npm run dev`             | Start the Astro development server with hot reload       |
| `npm run dev:e2e`         | Start the dev server in test mode (used by Playwright)   |
| `npm run build`           | Build the application for production                     |
| `npm run preview`         | Preview the production build locally                     |
| `npm run astro`           | Run Astro CLI commands                                   |
| `npm run lint`            | Run ESLint to check for code issues                      |
| `npm run lint:fix`        | Automatically fix ESLint issues where possible           |
| `npm run format`          | Format code using Prettier                               |
| `npm run test`            | Execute the Vitest suite once (default run)              |
| `npm run test:unit`       | Alias for `npm run test` (used in CI workflows)          |
| `npm run test:unit:watch` | Run Vitest in watch mode                                 |
| `npm run test:coverage`   | Generate an HTML and LCOV coverage report via Vitest     |
| `npm run test:e2e`        | Run Playwright end-to-end tests in headless Chromium     |
| `npm run test:e2e:ci`     | Run Playwright tests in CI-friendly mode (single worker) |
| `npm run test:e2e:headed` | Run Playwright E2E tests with a visible browser          |
| `npm run test:e2e:report` | Open the most recent Playwright HTML report              |

## Testing

### Unit & Integration Testing (Vitest)

- **Commands**: `npm run test` for watch mode, `npm run test:unit` for CI-style runs, `npm run test:coverage` for
  V8-based coverage.
- **Configuration**: `vitest.config.ts` uses the React plugin, resolves `@` to `src/`, and loads shared setup from
  `src/tests/setup.ts` (registers `@testing-library/jest-dom` and cleans up renders).
- **Guidelines**: Follow the mocking, structure, and jsdom practices outlined in `.windsurf/rules/vitest.md`.
- **Scope**: Align scenarios and coverage priorities with `_ai/test-plan.md` (Unit/Integration sections).

### End-to-End Testing (Playwright)

- **Commands**: `npm run test:e2e` (headless) or `npm run test:e2e:headed` for local debugging. View run history with
  `npm run test:e2e:report`.
- **Configuration**: `playwright.config.ts` targets Chromium (`Desktop Chrome` profile), records traces on first retry,
  and automatically boots the Astro dev server on `http://localhost:4321` for the E2E test environment.
- **Guidelines**: Apply the Page Object Model, locator usage, and trace review practices documented in
  `.windsurf/rules/playwright.md`.
- **Test Plan Alignment**: Reference flow coverage requirements and environment notes in `_ai/test-plan.md` (E2E
  section).

## Project Scope

### ✅ In Scope

- Web-only responsive UI (desktop and mobile browsers)
- Manual entry of expenses and stash transactions
- Hardcoded expense categories
- Single currency support (PLN)
- Secure authentication and password reset

### 🔄 Planned for Future Implementation

- Account deletion with complete data removal

## Project Status

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Status](https://img.shields.io/badge/status-in%20development-yellow)

**Current Version**: 0.0.1

StashTracker is currently in early development. Core features are being implemented according to the product
requirements document.

### Implemented Features

- [x] User registration and authentication
- [x] Password reset functionality
- [x] Stash management (create, add/remove funds, delete)
- [x] Expense tracking with categories
- [x] Monthly budget setting
- [x] Transaction history
- [x] Responsive design
- [ ] Account deletion

## License

This project's license is to be determined. Please contact the project maintainers for licensing information.

---

For questions, issues, or contributions, please refer to the project's issue tracker or contact the development team.
