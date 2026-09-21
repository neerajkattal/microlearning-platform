# Learning note: Alembic in a monorepo

`ENGINEERING.md` puts `migrations/` at the repo root, separate from
`services/api` where the SQLAlchemy models actually live. That's a
deliberate monorepo convention (migrations as an infra-level concern,
decoupled from any one service's code layout) but it means Alembic's
`env.py` can't just `from app.database import Base` the normal way — that
module doesn't exist relative to the repo root.

Fix: `migrations/env.py` inserts `services/api` into `sys.path` before
importing anything from `app`. It's a few lines (see the file), and it's
the standard pattern for this — Alembic doesn't care where its models come
from, it just needs `target_metadata` to be a real `MetaData` object by
the time `env.py` finishes running.

One consequence worth knowing: because `services/api` isn't installed as a
package, running `alembic` commands requires either being in a Python
environment that already has `services/api`'s dependencies installed (its
own `.venv`), or `services/api` would need to become a proper installable
package. We went with the former (see the `Makefile`'s `migrate` target,
which explicitly points at `services/api/.venv/bin/alembic`) since it's
simpler and there's only one service using this database today.

If a second service ever needs the same models (unlikely while this stays
a modular monolith — see ADR-0001), that's the point to reconsider making
the models a proper installable package.
