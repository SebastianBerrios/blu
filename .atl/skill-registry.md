# Skill Registry — blu

<!-- Maintained by sdd-init. Last updated: 2026-07-23 -->

Last updated: 2026-07-23

## Sources scanned

- .claude\skills
- .agents\skills
- C:\Users\sberr\.agents\skills
- C:\Users\sberr\.claude\skills
- C:\Users\sberr\.gemini\skills
- C:\Users\sberr\.cursor\skills
- C:\Users\sberr\.copilot\skills

## Contract

**Delegator use only.** This registry is an index, not a summary. Any agent that launches subagents reads it to select relevant skills, then passes exact `SKILL.md` paths for the subagent to read before work.

`SKILL.md` remains the source of truth. Do not inject generated summaries or compact rules by default; pass paths so subagents load the full runtime contract and preserve author intent.

## Skills

| Skill | Trigger / description | Scope | Path |
| --- | --- | --- | --- |
| `branch-pr` | Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | user | `C:\Users\sberr\.claude\skills\branch-pr\SKILL.md` |
| `cafeteria-architecture` | Enforces architecture, design principles, and coding standards for a Next.js + Supabase + TypeScript cafeteria management system (finance, inventory, products, sales). Use this skill whenever creating, modifying, or reviewing any feature, component, hook, service, type, or utility in the cafeteria project. Triggers on: adding new features, creating components, writing hooks, building services, defining types, refactoring code, reviewing pull requests, or any code generation task for this project. Also triggers when the user mentions "nueva funcionalidad", "nuevo módulo", "agregar feature", "crear componente", "refactorizar", or asks how to structure/organize code in the cafeteria system. Even if the user just says "add a button" or "create a page" — if it's in the cafeteria project context, use this skill. | project | `D:\Programming\Frontend\blu\.claude\skills\cafeteria-architecture\SKILL.md` |
| `chained-pr` | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | user | `C:\Users\sberr\.claude\skills\chained-pr\SKILL.md` |
| `cognitive-doc-design` | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | user | `C:\Users\sberr\.claude\skills\cognitive-doc-design\SKILL.md` |
| `comment-writer` | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | user | `C:\Users\sberr\.claude\skills\comment-writer\SKILL.md` |
| `find-skills` | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. | user | `C:\Users\sberr\.agents\skills\find-skills\SKILL.md` |
| `frontend-design` | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. | project | `D:\Programming\Frontend\blu\.claude\skills\frontend-design\SKILL.md` |
| `go-testing` | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | user | `C:\Users\sberr\.claude\skills\go-testing\SKILL.md` |
| `issue-creation` | Create Gentle AI issues with issue-first checks. Trigger: creating GitHub issues, bug reports, or feature requests. | user | `C:\Users\sberr\.claude\skills\issue-creation\SKILL.md` |
| `judgment-day` | Trigger: judgment day, dual review, adversarial review, juzgar. Run blind dual review, fix confirmed issues, then re-judge. | user | `C:\Users\sberr\.claude\skills\judgment-day\SKILL.md` |
| `playwright-cli` | Automate browser interactions, test web pages and work with Playwright tests. | user | `C:\Users\sberr\.agents\skills\playwright-cli\SKILL.md` |
| `react-doctor` | Run after making React changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in a React project. | project | `D:\Programming\Frontend\blu\.agents\skills\react-doctor\SKILL.md` |
| `sanity-best-practices` | Sanity development best practices for schema design, GROQ queries, TypeGen, Visual Editing, images, Portable Text, Studio structure, localization, migrations, Sanity Functions, Blueprints, and framework integrations such as Next.js, Nuxt, Astro, Remix, SvelteKit, Angular, Hydrogen, and the App SDK. Use this skill whenever working with Sanity schemas, defineType or defineField, GROQ or defineQuery, content modeling, Presentation or preview setups, Sanity-powered frontend integrations, Sanity Functions, documentEventHandler, defineDocumentFunction, defineMediaLibraryAssetFunction, @sanity/functions, @sanity/blueprints, sanity.blueprint.ts, event-driven content automation, or when reviewing and fixing a Sanity codebase. | user | `C:\Users\sberr\.claude\skills\sanity-best-practices\SKILL.md` |
| `sanity-migration` | Plans, implements, and reviews migrations from other CMSes and content systems into Sanity. Use when migrating or replatforming to Sanity from AEM, Adobe Experience Manager, Contentful, Strapi, Webflow, WordPress, Payload, Drupal, Markdown/MDX/frontmatter files, WXR/XML exports, CMS APIs, database dumps, static HTML, or when designing extraction, transformation, Portable Text conversion, asset migration, redirects, validation, and cutover workflows. | user | `C:\Users\sberr\.claude\skills\sanity-migration\SKILL.md` |
| `skill-creator` | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | user | `C:\Users\sberr\.claude\skills\skill-creator\SKILL.md` |
| `skill-improver` | Trigger: improve skills, audit skills, refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | user | `C:\Users\sberr\.claude\skills\skill-improver\SKILL.md` |
| `supabase` | Use when doing ANY task involving Supabase. Triggers: Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues); client libraries and SSR integrations (supabase-js, @supabase/ssr) in Next.js, React, SvelteKit, Astro, Remix; auth issues (login, logout, sessions, JWT, cookies, getSession, getUser, getClaims, RLS); Supabase CLI or MCP server; schema changes, migrations, security audits, Postgres extensions (pg_graphql, pg_cron, pg_vector). | project | `D:\Programming\Frontend\blu\.claude\skills\supabase\SKILL.md` |
| `supabase-postgres-best-practices` | Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations. | project | `D:\Programming\Frontend\blu\.claude\skills\supabase-postgres-best-practices\SKILL.md` |
| `vercel-react-best-practices` | React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements. | project | `D:\Programming\Frontend\blu\.claude\skills\vercel-react-best-practices\SKILL.md` |
| `vitest` | Vitest fast unit testing framework powered by Vite with Jest-compatible API. Use when writing tests, mocking, configuring coverage, or working with test filtering and fixtures. | user | `C:\Users\sberr\.agents\skills\vitest\SKILL.md` |
| `webapp-testing` | Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs. | user | `C:\Users\sberr\.agents\skills\webapp-testing\SKILL.md` |
| `work-unit-commits` | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | user | `C:\Users\sberr\.claude\skills\work-unit-commits\SKILL.md` |

## SDD Phase Skill Matching

For SDD phases, always match these skills by task context:

| Phase | Skills to inject |
| --- | --- |
| sdd-explore / sdd-propose / sdd-spec / sdd-design / sdd-tasks | `cafeteria-architecture` (all tasks), + `supabase` (DB changes), + `vercel-react-best-practices` (React/Next.js) |
| sdd-apply (UI) | `cafeteria-architecture`, `frontend-design`, `vercel-react-best-practices`, `react-doctor` |
| sdd-apply (DB/auth) | `cafeteria-architecture`, `supabase`, `supabase-postgres-best-practices` |
| sdd-apply (tests) | `cafeteria-architecture`, `vitest` |
| sdd-verify | `cafeteria-architecture`, `vitest` |
| PR creation | `branch-pr`, `chained-pr` (if oversized), `work-unit-commits` |

## Loading protocol

1. Match task context and target files against the `Trigger / description` column.
2. Pass only the matching `Path` values to the subagent under `## Skills to load before work`.
3. Instruct the subagent to read those exact `SKILL.md` files before reading, writing, reviewing, testing, or creating artifacts.
4. If no matching skill exists, proceed without project skill injection and report `skill_resolution: none`.
