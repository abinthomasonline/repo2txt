# repo2txt

[![Deploy](https://github.com/abinthomasonline/repo2txt/actions/workflows/deploy.yml/badge.svg)](https://github.com/abinthomasonline/repo2txt/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 💡 **Looking for the classic version?** Check out [repo2txt-classic](https://github.com/abinthomasonline/repo2txt-classic)

> **Convert repositories to plain text for LLM prompts**
> Fast, browser-based tool for AI-assisted development

🔗 **[Try it now →](https://abinthomas.in/repo2txt/)**

## ✨ Features

### 🔌 Multiple Sources
- **GitHub** - Public and private repositories with token support
- **Local Files** - Directory picker for your local projects
- **Zip Upload** - Drag & drop zip files
- **GitLab** (Beta) - GitLab repository support
- **Azure DevOps** (Beta) - Azure Repos integration

### 🎯 Smart Filtering
- **Extension Filter** - Select/deselect by file type
- **Gitignore Support** - Automatically respect .gitignore patterns
- **Custom Patterns** - Add your own ignore patterns
- **Directory Selection** - Cherry-pick specific folders
- **File Tree Preview** - Visual file selection with virtual scrolling

### 🚀 Performance
- **Virtual Scrolling** - Handle repositories with 10,000+ files
- **Code Splitting** - Lazy-loaded providers for optimal bundle size
- **Web Workers** - Tokenization runs in background threads
- **Progressive Loading** - Stream file contents as they load
- **Smart Caching** - Efficient memory usage for large repos

### 🎨 Modern UX
- **Dark Mode** - System, light, and dark themes
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Token Counter** - Real-time GPT token counting
- **File Statistics** - Per-file token and line counts
- **Progress Indicators** - Clear feedback during loading

### 🔒 Privacy First
- **100% Browser-Based** - No server uploads, all processing is local
- **No Tracking** - Your code never leaves your device
- **Secure** - GitHub tokens stored in sessionStorage only
- **Open Source** - Fully auditable codebase

## 🚀 Quick Start

### Use Online
Visit [abinthomas.in/repo2txt](https://abinthomas.in/repo2txt/) - no installation needed!

### Run Locally
```bash
# Clone the repository
git clone https://github.com/abinthomasonline/repo2txt.git
cd repo2txt

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173/repo2txt/
```

### Build for Production
```bash
npm run build
# Output in ./dist folder
```

## 📖 Usage

### GitHub Repository
1. Paste a GitHub URL: `https://github.com/facebook/react`
2. Optionally add a personal access token for:
   - Private repositories
   - Higher rate limits (5000 vs 60 requests/hour)
3. Click "Load Repository"
4. Select files using the tree or extension filters
5. Click "Generate Output"
6. Copy to clipboard or download as `.txt`

**Supported URL formats:**
- `https://github.com/owner/repo` (default branch)
- `https://github.com/owner/repo/tree/branch-name`
- `https://github.com/owner/repo/tree/branch-name/path/to/folder`
- Branch names with slashes: `feature/test/branch-name` ✓

### Local Files
1. Switch to "Local" provider
2. Choose "Directory" or "Zip File"
3. Select your project folder or upload a zip
4. Same filtering and export options as GitHub

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand
- **File Handling**: JSZip
- **Tokenization**: gpt-tokenizer
- **Virtual Scrolling**: TanStack Virtual
- **Testing**: Vitest + Playwright
- **CI/CD**: GitHub Actions

## 📊 Project Stats

- **Bundle Size**: ~330KB main chunk (gzipped)
- **First Load**: < 2s on 3G
- **Test Coverage**: 100% E2E test pass rate
- **Performance**: Lighthouse 95+ across all metrics
- **Compatibility**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🤝 Contributing

We welcome contributions! Please see:
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide and architecture
- [AGENT.md](./AGENT.md) - Detailed design documentation for LLM agents

### Quick Contribution Guide
```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/repo2txt.git

# Create branch
git checkout -b feature/amazing-feature

# Make changes and test
npm run test:unit
npm run test:e2e

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# Open pull request
```

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- Built with ❤️ by [Abin Thomas](https://github.com/abinthomasonline)
- Inspired by the need for better LLM context preparation
- Thanks to all [contributors](https://github.com/abinthomasonline/repo2txt/graphs/contributors)

## 🔗 Links

- **Website**: [abinthomas.in/repo2txt](https://abinthomas.in/repo2txt/)
- **Issues**: [GitHub Issues](https://github.com/abinthomasonline/repo2txt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/abinthomasonline/repo2txt/discussions)
- **Changelog**: [Releases](https://github.com/abinthomasonline/repo2txt/releases)

## ⭐ Star History

If you find this project helpful, please consider giving it a star! It helps others discover the tool.

---

**Made with 🤖 for AI developers**
