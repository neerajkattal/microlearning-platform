from app.moderation import contains_banned_word


def test_flags_a_banned_word_on_its_own():
    assert contains_banned_word("fuck") is True


def test_flags_a_banned_word_embedded_in_a_longer_username():
    assert contains_banned_word("xXfuckyouXx") is True


def test_is_case_insensitive():
    assert contains_banned_word("FuCkYou") is True


def test_allows_an_ordinary_username():
    assert contains_banned_word("astro_gamer_42") is False


def test_does_not_flag_unrelated_words():
    # regression guard against an overly broad pattern
    assert contains_banned_word("classy_player") is False
    assert contains_banned_word("assassin_creed_fan") is False
