# Contributing to Vagabond-Fuse

Thank you for your interest in contributing to Vagabond-Fuse! This document provides guidelines and workflows to make the contribution process smooth and effective.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please read and follow our Code of Conduct.

## Getting Started

### Prerequisites

- Node.js (version ≥ 16)
- pnpm (we use workspaces for package management)
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/vagabond-cloud/Vagabond-Fuse.git
   cd Vagabond-Fuse
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```

## Development Workflow

This project uses a monorepo structure with pnpm workspaces. The main directories are:

- `packages/`: Reusable libraries and components
- `services/`: Standalone services
- `docs/`: Documentation
- `examples/`: Example implementations and mocks

### Working on Features

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Implement your changes
3. Write tests for your changes
4. Ensure all tests pass:
   ```bash
   pnpm test
   ```
5. Commit your changes following our commit message conventions

## Pull Request Process

1. Update the README.md or relevant documentation with details of changes if appropriate
2. Ensure your code passes all tests and linting
3. Submit a pull request to the `main` branch
4. The PR will be reviewed by maintainers
5. Address any requested changes
6. Once approved, a maintainer will merge your PR

### Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or modifying tests
- `chore`: Changes to the build process or auxiliary tools

## Coding Standards

- **TypeScript**: Follow the existing TypeScript configurations
- **Linting**: Ensure your code passes ESLint checks
- **Formatting**: We use Prettier for code formatting
- **Architecture**: Follow the established architectural patterns in the codebase

## Testing Guidelines

- Write unit tests for all new features and bug fixes
- Maintain or improve code coverage
- Integration tests should be added for API endpoints and services
- Run the full test suite before submitting PRs

## Documentation

- Update documentation when changing functionality
- Document all public APIs and interfaces
- Include code examples where appropriate
- Keep the README and other docs up-to-date

## Release Process

Our release process follows these steps:

1. Version bumps follow [Semantic Versioning](https://semver.org/)
2. Changelog updates are generated from conventional commit messages
3. Releases are tagged in Git and published to the appropriate registries

## Questions?

If you have any questions or need help, please:

- Open an issue for general questions
- Reach out to the maintainers for sensitive concerns

Thank you for contributing to Vagabond-Fuse!
