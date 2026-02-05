---
name: dcpr
description: Document changes, update CLAUDE.md changelog & roadmap, bump version, commit, push, and create PR
disable-model-invocation: false
argument-hint: "[version-bump: patch|minor]"
---

# Documentation, Changelog, and Pull Request

Perform the full /dcpr workflow:

## 1. Read Current State
- Read `CLAUDE.md` to understand current version and changelog
- Run `git log` to see commits since last version bump
- Run `git diff main...HEAD` to understand all changes on the current branch
- If on main, check recent commits since last version tag in CLAUDE.md

## 2. Update CLAUDE.md

### Version Bump
- Bump the version number at the top of CLAUDE.md
- Default: increment the minor version (e.g., v0.8 → v0.9)
- If user specifies "patch", increment patch (e.g., v0.8 → v0.8.1)

### Changelog Entry
- Add a new changelog section BEFORE the previous version entry
- Include all changes from the commits being documented
- Group changes by feature/area with bold headers
- Use the same format as existing changelog entries
- Be thorough — document every user-facing change

### Update Planned Features
- Mark any completed planned features as done (with strikethrough + version reference)
- Reorder remaining priorities if needed

### Update Other Sections
- Update the ChartRenderer, UI Controller, or other component descriptions if features changed them significantly
- Add new testing checklist items for new features
- Update Known Behaviors/Limitations if relevant

## 3. Commit
- Stage only `CLAUDE.md` (and any other doc files changed)
- Commit with message: `docs: Bump to vX.Y, add changelog for [brief summary]`
- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

## 4. Push & PR
- Push the current branch to origin
- Create a PR using `gh pr create` with:
  - Title: `docs: Bump to vX.Y with [feature] changelog`
  - Body: Summary of what was documented, list of changelog sections added
