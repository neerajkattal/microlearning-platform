import re

# Deliberately a short, maintainable list of clear-cut cases rather than an
# exhaustive third-party profanity database - this catches the obvious stuff
# at registration time; anything that slips past (leetspeak, a slur not on
# this list, context-dependent abuse) is what the admin rename/hide tools
# in routers/admin.py are for. Every entry here is specific enough that a
# plain substring match doesn't produce false positives on ordinary words.
_BANNED_WORDS = [
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "cunt",
    "nigger",
    "nigga",
    "faggot",
    "retard",
    "rape",
    "nazi",
    "hitler",
]

_BANNED_PATTERN = re.compile(
    r"(?:" + "|".join(re.escape(word) for word in _BANNED_WORDS) + r")",
    re.IGNORECASE,
)


def contains_banned_word(username: str) -> bool:
    return _BANNED_PATTERN.search(username) is not None
