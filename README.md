# StashTracker

A lightweight, personal web application that enables users to manually track everyday expenses and savings ("stashes") in PLN. StashTracker focuses on simplicity, providing a simple, responsive browser-based interface.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

StashTracker is designed to help users maintain visibility over their discretionary spending and savings progress with minimal friction. The application allows users to:

- **Track Expenses**: Set monthly budgets, record expenses with categories and amounts
- **Manage Stashes**: Create stashes, which can be a Savings Account, a Broker Account, a Crypto Wallet, etc. - add or remove funds, and track transaction history

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

5. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:4321` (or the port specified by Astro)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Astro development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run preview` | Preview the production build locally |
| `npm run astro` | Run Astro CLI commands |
| `npm run lint` | Run ESLint to check for code issues |
| `npm run lint:fix` | Automatically fix ESLint issues where possible |
| `npm run format` | Format code using Prettier |

## Project Scope

### ✅ In Scope

- Web-only responsive UI (desktop and mobile browsers)
- Manual entry of expenses and stash transactions
- Hardcoded expense categories
- Single currency support (PLN)
- Secure authentication and password reset
- Account deletion with complete data removal

## Project Status

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Status](https://img.shields.io/badge/status-in%20development-yellow)

**Current Version**: 0.0.1

StashTracker is currently in early development. Core features are being implemented according to the product requirements document.

### Implemented Features
- [ ] User registration and authentication
- [ ] Password reset functionality
- [ ] Stash management (create, add/remove funds, delete)
- [ ] Expense tracking with categories
- [ ] Monthly budget setting
- [ ] Transaction history
- [ ] Account deletion
- [ ] Responsive design

## License

This project's license is to be determined. Please contact the project maintainers for licensing information.

---

For questions, issues, or contributions, please refer to the project's issue tracker or contact the development team.
