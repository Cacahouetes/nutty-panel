---
name: find-skills
description: Discover and install specialized agent skills from the open ecosystem when users need extended capabilities.
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

## Process

1. Check the skills.sh leaderboard first for battle-tested, popular options.
2. If the leaderboard doesn't have what's needed, run `npx skills find [query]` to search interactively.
3. Review the skill details: install count, GitHub stars, source reputation.
4. Install with `npx skills add <package> --skill <skill-name>`.
5. Verify the skill was installed correctly in `.agents/skills/`.

## Recommendations

- Prefer skills with 1K+ installs
- Prefer official sources (Vercel, Anthropic, Matt Pocock)
- Check GitHub stars as a quality signal
