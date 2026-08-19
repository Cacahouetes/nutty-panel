---
name: qa
description: Run an interactive QA session. The user describes problems they're encountering, you clarify, explore the codebase, and file GitHub issues.
---

# QA Session

Run an interactive QA session. The user describes problems they're encountering. You clarify, explore the codebase for context, and file GitHub issues that are durable, user-focused, and use the project's domain language.

## For each issue the user raises

### 1. Listen and lightly clarify

Let the user describe the problem in their own words. Ask **at most 2-3 short clarifying questions** focused on:

- What they expected vs what actually happened
- Steps to reproduce (if not obvious)
- Whether it's consistent or intermittent

Do NOT over-interview. If the description is clear enough to file, move on.

### 2. Explore the codebase in the background

While talking to the user, kick off an explore agent in the background to understand the relevant area. The goal is NOT to find a fix — it's to:

- Understand the module structure
- Find the seams where the behavior is controlled
- Note any existing issues or patterns

### 3. File the issue

Write the issue using the project's domain language. Include:

- A clear, user-focused title
- The reproduction steps
- Expected vs actual behavior
- The relevant code location (file:line)
- Apply the `status: new` and `bug` or `enhancement` labels

### 4. Suggest next steps

After filing, suggest whether the user wants to proceed to diagnosis, triage, or implementation.
