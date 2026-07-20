# 🤝 Contributing to OpenTaste

First off, thank you for considering contributing! 🎉

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).

## How Can I Contribute?

### 🐛 Reporting Bugs
- Check [Issues](https://github.com/namangoyal3/opentaste/issues) first
- Use the bug report template
- Include: OS, Node version, steps to reproduce

### 💡 Suggesting Features
- Open an issue with the "enhancement" label
- Describe the feature and why it's useful

### 📝 Improving Documentation
- Fix typos, clarify explanations, add examples
- Improve API documentation

### 🛠️ Contributing Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit with a descriptive message
6. Push and open a Pull Request

## Development Setup

```bash
git clone https://github.com/namangoyal3/opentaste.git
cd opentaste
pnpm install
pnpm build
```

## Adding a New Template

1. Add your template to `packages/core/src/templates.ts`
2. Include: id, name, description, targets, content, variables
3. Test with `ctx init --template your-template-id`

## Questions?

Open a [Discussion](https://github.com/namangoyal3/opentaste/discussions).
