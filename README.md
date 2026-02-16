# repo2txt v2.0 - Complete Redesign

🚧 **This branch is under active development** 🚧

## What is this branch?

This is the `v2-development` branch for the complete redesign and rewrite of [repo2txt](https://repo2txt.simplebasedomain.com) using modern web technologies.

## Why a redesign?

The current version works great, but has accumulated technical debt and several limitations:

- **Security vulnerabilities** (token storage, XSS risks)
- **Performance bottlenecks** (large repos, concurrent requests)
- **Code duplication** (~60% overlap between GitHub and local modes)
- **Limited extensibility** (hard to add GitLab, Azure DevOps support)
- **Missing features** (dark mode, mobile optimization, advanced filters)

## What's changing?

### Technology Stack

**From:**
- Vanilla JavaScript
- CDN dependencies
- No build process
- No testing

**To:**
- React 18 + TypeScript
- Vite build system
- TailwindCSS + Radix UI
- Comprehensive testing (Vitest + Playwright)
- Modern tooling (ESLint, Prettier, Husky)

### Architecture

**From:** Monolithic procedural code with mixed concerns

**To:** Modular architecture with:
- Provider pattern (easy to add GitLab, Azure DevOps)
- Separation of concerns (UI, business logic, API)
- Type safety throughout
- Testable components

### Features

All existing features PLUS:
- ✅ Dark mode (Issues #26, #27)
- ✅ GitLab support (Issue #24)
- ✅ Azure DevOps support (Issue #4)
- ✅ Mobile optimization (Issue #14)
- ✅ Token/line count per file (Issue #18)
- ✅ Include/exclude filters (Issue #13)
- ✅ Show excluded files (Issue #20)
- ✅ GitHub issues in prompt (PR #19)
- ✅ Secure token storage
- ✅ Performance optimizations
- ✅ And more...

## Implementation Plan

📄 **[Read the full implementation plan](./IMPLEMENTATION_PLAN.md)**

The redesign is broken into 16 phases:
1. Project setup & infrastructure
2. Core architecture & provider system
3. GitHub provider (port existing)
4. Local provider (port & enhance)
5. UI components (file tree, filters)
6. Enhanced gitignore parser
7. Formatter & tokenizer (with Web Worker)
8. Output panel & actions
9. Dark mode & theming
10. GitLab provider
11. Azure DevOps provider
12. Performance optimizations
13. Mobile optimization
14. Testing & QA
15. Documentation
16. Beta deployment & production rollout

## Current Status

**Phase:** 0 - Planning Complete ✅

**Next Steps:**
- [ ] Initialize Vite + React + TypeScript project
- [ ] Set up development environment
- [ ] Configure tooling (ESLint, Prettier, tests)
- [ ] Create project structure
- [ ] Set up CI/CD pipeline

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Getting Started

```bash
# Clone the repo
git clone https://github.com/abinthomasonline/repo2txt.git
cd repo2txt

# Switch to v2 branch
git checkout v2-development

# Install dependencies (once project is initialized)
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

### Project Structure (Planned)

```
repo2txt-v2/
├── src/
│   ├── features/           # Feature modules (github, local, gitlab, azure)
│   ├── components/         # Shared UI components
│   ├── lib/               # Core business logic
│   ├── hooks/             # Custom React hooks
│   ├── store/             # Zustand state management
│   └── workers/           # Web Workers
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
```

## Testing Strategy

- **Unit tests:** Vitest + React Testing Library (80%+ coverage target)
- **Integration tests:** Provider + FileTree interactions
- **E2E tests:** Playwright (critical user flows)
- **Visual regression:** Chromatic or Percy
- **Performance:** Lighthouse CI

## Deployment Strategy

1. **Development:** This branch
2. **Beta:** beta.repo2txt.simplebasedomain.com (2-3 weeks)
3. **Gradual rollout:** 10% → 50% → 100%
4. **Legacy available:** legacy.repo2txt.simplebasedomain.com

## Contributing

While this is under active development, contributions are welcome!

1. Read the [Implementation Plan](./IMPLEMENTATION_PLAN.md)
2. Check open issues or create one
3. Fork and create a feature branch
4. Make your changes with tests
5. Submit a pull request

## Backwards Compatibility

✅ **All existing functionality will be preserved**
- Same URLs will work
- No breaking changes for users
- Feature parity guaranteed
- Plus new features and improvements

## Timeline

Development is ongoing with no fixed timeline. We're prioritizing quality over speed.

**Estimated:** 8-12 weeks for beta, 2-4 weeks for production rollout

## Questions?

- **Issues:** [GitHub Issues](https://github.com/abinthomasonline/repo2txt/issues)
- **Email:** abinthomasonline@gmail.com
- **Original project:** [repo2txt](https://repo2txt.simplebasedomain.com)

## License

MIT License - same as the original project

---

**Note:** The master branch contains the current production version. This branch is for development only.
