# Contributing to vue-masonry-blade

Thanks for your interest in contributing to `vue-masonry-blade`.

A wrapper for `masonry-blade`, **featuring virtualization and reactivity.**

## Before opening an issue or pull request

Please check:

- Existing issues and pull requests
- The current README and public API behavior
- Whether your change is a bug fix, a test improvement, a documentation improvement, or a narrowly scoped feature
- Check our PR or issue public templates

For security issues, please do not open a public issue. See `SECURITY.md`.

## Development setup

### Requirements

- Node.js `>=22.22.2`
- `pnpm`

### Install

```bash
git clone https://github.com/steelWinds/vue-masonry-blade
cd vue-masonry-blade
pnpm install
```

## Day-to-day commands

```bash
pnpm build
pnpm test
pnpm test:run
pnpm test:coverage
pnpm lint
pnpm lint:fix
pnpm fmt
pnpm fmt:check
```

Notes:

- `pnpm test` is useful during development if you want the default interactive test workflow.
- `pnpm test:run` is the non-interactive test command used for validation and CI-style checks.

## Project boundaries

This library is intentionally narrow.

It is:

- A masonry layout engine
- Focused on source sizes, coordinates, and explicit rebuild inputs

It is not:

- An image loader
- A virtualization library

If you want to propose a broader feature, please open an issue first and explain the use case.

## What makes a good contribution

Good contributions usually include:

- Bug fixes
- Tests for regressions and edge cases
- Documentation improvements
- Type-level improvements
- Performance improvements backed by measurements
- Small API improvements that keep the library simple

Please avoid unrelated changes in the same pull request.

## Contribution guidelines

### Keep the scope small

Prefer changes that solve one problem well.

Avoid changes that:

- Expand the public API without strong value
- Add implicit or hard-to-explain behavior
- Make internal state harder to reason about
- Couple the project to a specific framework or rendering strategy
- Weaken guarantees around deterministic output, explicit rebuild behavior, or worker fallback

### Add tests for behavior changes

If you change behavior, add or update tests.

### Be careful with performance claims

If a change improves performance, include at least one of the following:

- a reproducible measurement
- a short explanation of the trade-off

Do not trade away readability or API clarity for tiny gains unless the benefit is clear.

### Keep documentation in sync

If public behavior changes, update the docs in the same pull request.

That usually means updating one or more of:

- `README.md`
- Public API examples
- Inline docs or comments for public APIs, if present

## Pull requests

### Before opening a PR

Please run:

```bash
pnpm lint
pnpm fmt:check
pnpm test:run
pnpm build
```

### What a good PR looks like

A good pull request should:

- Have a clear title
- Explain what changed and why
- Stay focused on one problem
- Include tests when applicable
- Update documentation when public behavior changes

### Keep PRs small

Smaller pull requests are easier to review and merge.

If possible, separate refactors from behavior changes.

## Bug reports

When reporting a bug, include:

- Package version
- Runtime or environment details
- Whether worker mode was enabled, disabled, or unavailable
- A minimal reproduction
- Expected behavior
- Actual behavior

A small reproducible example is much more useful than a long description.

## Feature requests

Feature requests are welcome, but they should fit the project goals:

- Small
- Predictable
- Low-level
- Framework-agnostic

When proposing a feature, explain:

- The problem
- Why the current API is not enough
- The smallest useful addition

## Documentation contributions

Documentation improvements are always useful, especially when they improve:

- Wording clarity
- API explanations
- Examples
- Edge-case notes
- Consistency across English and Russian docs

## Commit style

Please follow [Conventional Commits](https://www.conventionalcommits.org).

## Code style

The project uses automated formatting and linting.

Please rely on the configured tools and avoid manual stylistic churn.

## License

By contributing, you agree that your contributions will be distributed under the same license as the project.

## Thanks

Thanks for helping improve `vue-masonry-blade`.
