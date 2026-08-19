---
name: to-prd
description: Synthesizes conversation context into a structured PRD and publishes it to your project issue tracker.
---

# To PRD

This skill takes the current conversation context and codebase understanding and produces a PRD. Do NOT interview the user — just synthesize what you already know.

The issue tracker and triage label vocabulary should have been provided to you — run `/setup-matt-pocock-skills` if not.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

   Check with the user that these seams match their expectations.

3. Write the PRD using the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` triage label - no need for additional triage.

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Goals / Non-Goals

- **Goals**: What must be true for this PRD to be considered successful.
- **Non-Goals**: What this PRD explicitly does NOT cover. Use to keep the scope tight.

## User Stories

- As a [role], I want to [action] so that [benefit].

## Test Seams

The seams at which this feature will be tested. Prefer existing seams. The ideal number is one.

## Technical Design

High-level architecture of the approach. Reference modules, seams, and any ADRs.

## Acceptance Criteria

- [ ] Criteria 1
- [ ] Criteria 2

## Out of Scope

Anything explicitly excluded from this PRD.
