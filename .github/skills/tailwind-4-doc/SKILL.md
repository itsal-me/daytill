---
name: tailwind-4-doc
description: "Use when working on Tailwind CSS v4 styling in Next.js or React projects; consult the Tailwind v4 docs before implementing utilities, layout, theming, responsive behavior, or configuration changes."
metadata:
  author: 'GitHub Copilot'
---

# Tailwind v4 Documentation Workflow

Use this skill when a task involves Tailwind CSS v4 styling, component layout, theming, or configuration in a Next.js or React codebase.

## Workflow

1. Identify the styling surface.
   - Determine whether the task is about layout, spacing, typography, color, responsive behavior, dark mode, animation, container queries, or build/configuration.
   - Prefer the smallest scope that solves the request.

2. Check the Tailwind v4 docs first.
   - Look up the relevant v4 guidance before writing utilities or configuration.
   - Confirm any changed syntax, defaults, or migration-specific behavior before editing code.

3. Apply the repo's Next.js + Tailwind standards.
   - Use semantic HTML.
   - Keep components responsive and accessible.
   - Favor server components unless client state or interactivity requires otherwise.
   - Preserve consistent color usage, spacing rhythm, and dark mode support.

4. Prefer composable utility-driven changes.
   - Add or adjust Tailwind classes before introducing custom CSS.
   - Use reusable component patterns for repeated styling.
   - Avoid over-engineering with extra abstractions when a utility change is enough.

5. Validate the result.
   - Check for broken class names, inconsistent responsive behavior, or missing semantic structure.
   - Make sure any Tailwind-specific config, plugin, or import changes match v4 conventions.

## Completion Checks

- The implementation matches Tailwind v4 guidance for the feature being changed.
- The code fits the existing Next.js App Router and TypeScript conventions.
- The final UI remains responsive, accessible, and visually consistent.

## Good Triggers

- "Use Tailwind v4 docs for this component"
- "Update this layout for Tailwind v4"
- "Fix responsive styling in Next.js"
- "Apply the right Tailwind v4 classes here"
- "Check the Tailwind docs before changing this styling"