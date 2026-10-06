# Why We Chose Domain Profiles Over Multi-Agent Swarms

### A technical architecture review on agent topology, data boundaries, and token efficiency

**Author:** Krishnendu Biswas  
**Date:** 6 October 2026  
**Category:** Systems Architecture & Agent Engineering  

---

## 1. The Siren Song of Functional Multi-Agent Systems

When designing an autonomous AI estate to handle diverse workloads (finance, academic research, corporate outreach, systems engineering, and publishing), the intuitive pattern is functional decomposition.

The common proposal looks clean on a whiteboard:
- A central dispatcher or coordinator.
- Specialized standing agents: a "Researcher" who harvests data, a "Marketer" who sharpens positioning, an "Analyst" who inspects rigor, a "Writer" who crafts prose, and a "Designer" who formats decks.
- Dynamic routing: the coordinator breaks a user request into subtasks and orchestrates handoffs across specialists.

The argument for this design usually rests on two claims:
1. Smaller, specialized skill sets prevent tool hallucination.
2. Distinct persona instructions produce deeper domain expertise.

When we audited our single-operator Hermes Agent installation (managing 11 domain profiles plus 1 central router across tens of millions of tokens) against empirical research and industry findings, both assumptions broke down under production realities.

---

## 2. What Empirical Research and Industry Data Reveal

### A. The Token Tax and Diminishing Returns
Anthropic Engineering's published findings on their multi-agent research system (June 13, 2025) provide the clearest empirical benchmark on the cost of agentic parallelism. In their measurements, a single agent using tools consumes roughly 4x the tokens of a plain chat interaction, whereas an orchestrator-worker multi-agent setup consumes roughly 15x the tokens of a chat interaction.

While their multi-agent supervisor system achieved a 90.2% performance improvement on open-ended research evaluations, their analysis revealed a critical nuance: three factors (token budget, tool call count, and model choice) accounted for 95% of performance variance, with token spend alone explaining roughly 80% of the variance. In practice, the performance advantage of multi-agent orchestration is overwhelmingly a function of compute spend.

For routine operational, analytical, and engineering tasks, fanning out standing functional agents burns massive token volume with negligible quality gains.

### B. The Single-Writer Principle and Context Fragmentation
Cognition (the creators of Devin) identified a fundamental point of failure in multi-agent systems: parallel writers introduce conflicting implicit decisions. 

Context in an agent session is not merely the initial user prompt; it encompasses the complete trace of file inspections, syntax probes, tool calls, and implicit architectural trade-offs. When multiple agents write to the same workspace or document simultaneously, these implicit decisions collide. Subagents lack the full historical arc of user intent, leading to fragmented naming conventions, conflicting dependencies, and duplicate logic.

Their core insight holds across production environments: multiple agents can be effectively utilized to read data, gather intelligence, explore search paths, or critique drafts, but write operations must remain strictly single-threaded.

### C. Skill Selection versus Agent Proliferation
Recent empirical evaluations of tool-use architectures by Liu et al. (arXiv:2601.04748, January 2026, "When Single-Agent with Skills Replace Multi-Agent Systems and When They Fail") demonstrate that a single agent equipped with an organized tool library matches multi-agent accuracy across complex benchmarks. 

Tool misselection in LLM agents does not scale linearly with the total number of available tools; rather, performance remains stable until a threshold where semantic overlap between similar tool descriptions causes confusion. The remedy for tool selection failure is structured tool categorization and curated prompt context, not spawning additional agents.

---

## 3. The Unspoken Challenge: Data Boundaries and Security Airgaps

In a production environment handling real-world personal, professional, and institutional operations, functional agent swarms encounter a fatal security flaw: cross-domain data pollution.

In our operational estate, workloads belong to distinct domains:
- **Institutional and Academic Operations:** Partner communications, institutional records, strict suppression lists, and non-negotiable data retention boundaries.
- **Personal Candidature:** Individual resume tailoring, private interview preparation, and personal job trackers.
- **Personal Finance:** Private ledger transactions, self-hosted financial databases, bank parsing secrets, and expense analytics.
- **Infrastructure and Host Operations:** Systemd units, reverse proxy configurations, and host secret engines.

If we deployed standing functional agents (such as a shared "Researcher" or "Slide Designer") across these tasks:
- The standing agent's memory store, context cache, and session transcripts would inevitably mix confidential institutional data with personal career materials.
- Maintaining separate airgaps would require brittle, prompt-level access controls that fail under pressure.

Physical partition by domain (separate profiles with dedicated storage directories, independent state databases, isolated persistent memory ledgers, and distinct secret scopes) provides deterministic, zero-leak data boundaries.

---

## 4. Our Architecture: Domain Profiles + Ephemeral Functional Roles

Instead of standing functional agents or an unconstrained swarm, we adopted a two-level, data-isolated architecture:

```
Level 0: Hub (Central Default Profile)
  |
  +-- Routes via Kanban Cards (Deterministic Domain Hand-off)
  v
Level 1: Domain Owner (e.g., Workhorse, Academics, Finance, Infrastructure)
  |  * Dedicated workspace, state.db, and memory airgaps
  |  * Sole writer for the final artifact
  |
  +-- Spawns on-demand via delegate_task
  v
Level 2: Ephemeral Subagent Roles (Read and Review Only)
     +-- Research Role (Parallel harvesting, returns sourced facts)
     +-- Critic Role   (Adversarial review with targeted lenses)
     +-- Deck Role     (Specialized slide builder; sole writer if invoked)
```

### Key Architectural Principles

1. **Life-Domain Isolation First:** Profiles exist to enforce strict data boundaries and own distinct cron schedules, not to simulate personality archetypes.
2. **Ephemeral Functional Roles:** Specialized capabilities (such as parallel literature search or adversarial critique) are invoked as short-lived subagent roles within the owning profile's session. They inherit the profile's security perimeter and vanish upon task completion.
3. **Strict Single-Writer Rule:** The domain owner remains the primary author. Research roles harvest facts; critic roles produce structured defect lists; only one worker writes to disk at any time.
4. **Deterministic Pre-flight Before LLM:** Code execution, exact string matching, SQL queries, and local Python checkers run before invoking high-tier reasoning models.

---

## 5. Pilot Instrumentation and Empirical Validation

To validate this approach against our baseline monolithic execution, we instituted an empirical validation pilot tracking:
- Total token spend per finished deliverable (prompt tokens, completion tokens, and cache read/write ratios).
- Wall-clock execution latency and retry iterations.
- Quality metrics: defect fix rates within 7 days, reviewer changes requested, and first-pass validation rates.

### Explicit Kill Criteria
We will revert to monolithic single-session execution if:
1. Token consumption exceeds 3x baseline without measurable quality improvements.
2. Subagent crash rates exceed baseline worker errors.
3. First-pass verification rates drop below baseline.
4. Any cross-domain data leakage is detected.

By grounding our agent topology in data isolation, single-writer discipline, and empirical verification, we keep the estate fast, private, and dependable.
