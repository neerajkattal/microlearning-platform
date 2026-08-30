"""Job registry. Phase 0 ships no real jobs — this exists so `app.main`'s
loop has something concrete to iterate over once Phase 1 adds the OpenTDB
ingestion job here (see docs/BUILD_PLAN.md, Phase 1)."""

from typing import Callable

Job = Callable[[], None]

JOB_REGISTRY: dict[str, Job] = {}
