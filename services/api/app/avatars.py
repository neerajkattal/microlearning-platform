# The set of characters a player can pick as their avatar. Stored as
# keys (not emoji) on the User row - the frontend owns the actual glyph
# for each key (apps/web/src/avatars.ts), kept in sync by hand since
# there's no shared-types package crossing the Python/TypeScript
# boundary here (see ENGINEERING.md's "modular monorepo, not microservices" -
# this is the one place that boundary costs a little duplication).
AVATAR_KEYS = [
    "astronaut",
    "hero",
    "wizard",
    "robot",
    "cat",
    "fox",
    "dragon",
    "alien",
    "ninja",
    "vampire",
    "lion",
    "panda",
]

DEFAULT_AVATAR = "astronaut"
