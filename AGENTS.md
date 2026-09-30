# AGENTS.md — Orchestration & Operational Policy

## 1. Orchestration & Agent Roles

### Interaction Model
- **Natural Conversation:** The user interacts using normal, natural language (e.g. „sprawdź stronę, znajdź problem, napraw i przetestuj”).
- **No Manual Agent/Model Selection:** The user never manually selects models, agents, or personas. Codex autonomously determines execution strategy.
- **Autonomous Strategy:** Simple tasks are handled entirely by the primary Luna instance. Complex, multi-step tasks may be decomposed and delegated to specialized subagents.
- **Result Integration:** The primary Luna instance integrates all subagent results, verifies consistency, and communicates directly with the user.

### Agent Roles & Allocation
- **Primary Driver / Orchestrator: Luna (`gpt-6-luna`)**
  - Handles direct conversation, overall planning, synthesis, and execution.
- **Researcher (`gpt-6-luna`):**
  - Read-only focused repository investigation.
  - No file modifications; targets only in-scope files and questions.
  - Multiple independent read-only research tasks can run concurrently in parallel.
- **Worker (`gpt-6-luna`):**
  - Scoped implementation of bounded coding tasks.
  - Operates on files identified by research without broad repo re-exploration.
  - Concurrency safety rule: **Multiple workers must NEVER edit the same files simultaneously.**
  - Reports changed files, tests executed, results, and issues.
- **Tester (`gpt-6-luna`):**
  - Test execution, regression checks, and failure analysis.
  - Does not modify production code autonomously unless specifically instructed.
- **Reviewer: Astra (`gpt-6-astra`) — Quota-Sensitive Specialized Reviewer:**
  - Invoked **strictly and only** as a final result reviewer for `COMPLEX` tasks (after implementation and testing by Luna).
  - Invocation quota rule:
    * `SIMPLE` / `NORMAL`: **Zero (0)** Astra invocations.
    * `COMPLEX`: **Maximum one (1)** Astra invocation per task (strictly as Final Result Review; Astra does NOT perform a separate plan review).
    * Exception: An additional Astra review is permitted **only when the user explicitly requests** an additional Astra review.
  - Research, planning, implementation, and testing are always executed by Luna.
  - Astra is NEVER the main model and NEVER does routine implementation, broad research, styling, or simple fixes.
  - Reviews only a compact review packet prepared by Luna (goal, requirements, changes summary, diff, test results, identified risks). Does not receive full conversational history or the entire repository.
  - Output format: `REVIEW: PASS` or `REVIEW: CHANGES_REQUIRED` with Critical / Major / Minor classifications.

### Safety, Testing & Environment Rules
- Always preserve test integrity, lint checks, type safety, and clean git history.
- Never commit secrets, service keys, or bypass safety guardrails.
- Always verify changes locally before reporting completion.

---

## 2. Persistent Main Task & Execution Continuity

Codex maintains the active main task until it is fully completed or explicitly cancelled/replaced by the user.

A side question from the user does not supersede an unfinished main task unless the user explicitly cancels, replaces, or materially changes the main task. Answer the side question, then automatically resume the active main task.

### Side Question Interruption Handling
If during a long-running or multi-stage task the user asks about:
- an e-mail address,
- a single file or path,
- a domain or DNS setting,
- a concrete detail or configuration key,
- a small, isolated technical problem,

**Codex must:**
1. Answer the question or perform the quick side task directly,
2. Remember the exact interruption point and work state,
3. Automatically resume the active main task immediately afterward,
4. Continue execution without waiting for prompt triggers such as „wznów”, „kontynuuj”, or „wracaj do pracy”.

---

## 3. Do Not Stop After Partial Completion

Never terminate the overall task after:
- completing one single page,
- finishing one batch of changes,
- identifying a single problem or deficiency,
- encountering one failed command,
- encountering one failing test,
- encountering one tool or operation block,
- receiving one review,
- producing one partial progress report.

Upon completing any individual item or batch, automatically transition to the next item in the main plan.

---

## 4. User Approval Does Not Freeze Everything

If one part of the task requires user approval, pause only the dependent branch. Continue all independent work that can safely proceed without that decision.

- Do not stall unrelated tasks, parallel modules, test suites, or documentation updates while waiting for user input on an isolated question.
- Mark the dependent item as `NEEDS_USER_DECISION` and continue with the next available `TODO` or unblocked task.

---

## 5. Approval Mode

When the user specifies:
> „dawaj mi do akceptacji”

This must **NOT** be interpreted as „halt all work after every single trivial edit”.

### Batch Workflow
Work in well-defined batches:
1. **Investigate — Luna:** Inspect the current state, code, and visuals.
2. **Assess — Luna:** Evaluate against UX, conversion, consistency, and functional criteria.
3. **Plan — Luna:** Prepare a concrete plan for the batch.
4. **Implement — Luna / odpowiedni Luna worker:** Apply approved and obvious improvements.
5. **Test — Luna tester:** Run automated tests, typechecks, and builds.
6. **Inspect — Luna:** Visually inspect the results (desktop & mobile).
7. **Final Result Review (COMPLEX only) — Astra, maximum one review:** Invoke Astra strictly once as a final result review on the compact review packet (zero invocations for SIMPLE/NORMAL tasks).
8. **If Astra reports actionable problems — Luna applies verified fixes and reruns relevant tests:** Luna applies verified fixes and reruns relevant tests without re-invoking Astra, unless the user explicitly requests an additional review.
9. **Advance:** Proceed to the next section or batch.

### Items Requiring User Approval
Present to the user for explicit approval:
- Significant changes in visual direction, palette, or branding,
- Material modifications to product/service offers and pricing,
- Significant alterations to core sales copy,
- Removal or deprecation of important user-facing functionality,
- Choices between fundamentally different architectural or UX variants.

Do **NOT** stop or seek approval for obvious technical bug fixes, syntax errors, accessibility fixes, missing attributes, standard refactoring, or lint/type cleanup.

---

## 6. Active Work Queue

During multi-step or project-wide tasks, maintain an internal state machine:
- `TODO` — Pending work items.
- `IN_PROGRESS` — Currently active item.
- `DONE` — Fully verified and completed items.
- `NEEDS_USER_DECISION` — Items blocked strictly pending user input.
- `BLOCKED` — Items blocked by external or technical constraints.

After answering a side question, immediately resume the active `IN_PROGRESS` item. If none is in progress, pull the next item from `TODO`.

---

## 7. Blocked Operations Procedure

A blockage on a single operation or command must never terminate the entire task.

**Procedure:**
1. Attempt a permitted, safe alternative approach.
2. If the operation remains blocked, mark the item as `BLOCKED`.
3. Record the exact failure reason and context.
4. Continue remaining unblocked work in the queue.
5. Revisit the blocked item later if conditions change or prerequisite steps complete.
6. Report the blocked item with details in the final summary.

---

## 8. Tests and Follow-Through

Whenever changes require:
- updating existing tests,
- writing new tests,
- running test suites (`npm test`, `jest`, `vitest`),
- linting (`npm run lint`),
- typechecking (`tsc --noEmit`),
- production build verification (`npm run build`),
- routing, redirects, and canonical checks,
- sitemap and robots verification,
- broken link checking,

**Execute these checks as part of the very same task.**

Do **NOT** terminate with messages such as:
> „testów nie uruchamiałem”

if running them is technically feasible and logically part of the work scope.

---

## 9. Reporting Policy

A partial or intermediate progress report does **NOT** indicate completion of the task.

After presenting a concise milestone report, automatically continue the task unless:
- All items in the work queue are `DONE`,
- Every remaining item is strictly waiting on `NEEDS_USER_DECISION`,
- Further execution is technically impossible due to unrecoverable system blockers.

The final completion report is delivered only after the entire active main goal has been accomplished.

---

## 10. Current Website Workflow (`regulskibehawiorysta.pl`)

For comprehensive site audit and improvement tasks across `regulskibehawiorysta.pl`:
- Advance systematically page by page across the entire site.
- Inspect both desktop and mobile viewports.
- Assess visual hierarchy, brand trust, professionalism, UX, and conversion/sales copy.
- Maintain a structured backlog of issues found.
- Implement agreed and obvious technical/layout improvements.
- Verify visual and technical results after each page batch.
- Advance to the next page in sequence.
- Keep track of pages already marked `DONE`.
- **Answering any side questions from the user never resets or abandons this page backlog.**

---

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
