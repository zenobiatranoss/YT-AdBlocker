package rules

import "testing"

func TestMatcherResourceType(t *testing.T) {
	parsed := Parse("||ads.example^$script")
	compiled, err := Compile(parsed)

	if err != nil {
		t.Fatal(err)
	}

	matcher := NewMatcher(compiled)

	if result := matcher.MatchRequest(
		"https://ads.example/script.js",
		"script",
		"https://youtube.com",
	); !result.Matched {
		t.Fatal("expected script request to be blocked")
	}

	if result := matcher.MatchRequest(
		"https://ads.example/image.jpg",
		"image",
		"https://youtube.com",
	); result.Matched {
		t.Fatal("expected image request to be allowed")
	}
}

func TestMatcherExcludedResourceType(t *testing.T) {
	parsed := Parse("||ads.example^$~image")
	compiled, err := Compile(parsed)

	if err != nil {
		t.Fatal(err)
	}

	matcher := NewMatcher(compiled)

	if result := matcher.MatchRequest(
		"https://ads.example/script.js",
		"script",
		"https://youtube.com",
	); !result.Matched {
		t.Fatal("expected script request to be blocked")
	}

	if result := matcher.MatchRequest(
		"https://ads.example/image.jpg",
		"image",
		"https://youtube.com",
	); result.Matched {
		t.Fatal("expected excluded image request to be allowed")
	}
}

func TestMatcherDomainContext(t *testing.T) {
	parsed := Parse("||ads.example^$domain=youtube.com")
	compiled, err := Compile(parsed)

	if err != nil {
		t.Fatal(err)
	}

	matcher := NewMatcher(compiled)

	if result := matcher.MatchRequest(
		"https://ads.example/ad.js",
		"script",
		"https://www.youtube.com",
	); !result.Matched {
		t.Fatal("expected youtube request to match")
	}

	if result := matcher.MatchRequest(
		"https://ads.example/ad.js",
		"script",
		"https://example.com",
	); result.Matched {
		t.Fatal("expected non-youtube request to be allowed")
	}
}

func TestMatcherExcludedDomain(t *testing.T) {
	parsed := Parse("||ads.example^$domain=youtube.com|~music.youtube.com")
	compiled, err := Compile(parsed)

	if err != nil {
		t.Fatal(err)
	}

	matcher := NewMatcher(compiled)

	if result := matcher.MatchRequest(
		"https://ads.example/ad.js",
		"script",
		"https://www.youtube.com",
	); !result.Matched {
		t.Fatal("expected youtube request to match")
	}

	if result := matcher.MatchRequest(
		"https://ads.example/ad.js",
		"script",
		"https://music.youtube.com",
	); result.Matched {
		t.Fatal("expected excluded domain to be allowed")
	}
}

func TestMatcherThirdParty(t *testing.T) {
	parsed := Parse("||ads.example^$third-party")
	compiled, err := Compile(parsed)

	if err != nil {
		t.Fatal(err)
	}

	matcher := NewMatcher(compiled)

	if result := matcher.MatchRequest(
		"https://ads.example/ad.js",
		"script",
		"https://youtube.com",
	); !result.Matched {
		t.Fatal("expected third-party request to match")
	}

	if result := matcher.MatchRequest(
		"https://ads.example/ad.js",
		"script",
		"https://sub.ads.example",
	); result.Matched {
		t.Fatal("expected same-party request to be allowed")
	}
}

func TestMatcherExceptionOverridesResourceRule(t *testing.T) {
	parsed := Parse(
		"||ads.example^$script\n" +
			"@@||ads.example/allowed.js$script",
	)

	compiled, err := Compile(parsed)

	if err != nil {
		t.Fatal(err)
	}

	matcher := NewMatcher(compiled)

	if result := matcher.MatchRequest(
		"https://ads.example/allowed.js",
		"script",
		"https://youtube.com",
	); result.Matched {
		t.Fatal("expected exception to override blocking rule")
	}

	if result := matcher.MatchRequest(
		"https://ads.example/blocked.js",
		"script",
		"https://youtube.com",
	); !result.Matched {
		t.Fatal("expected non-excepted request to be blocked")
	}
}

func TestMatcherMatchCase(t *testing.T) {
	parsed := Parse("||Ads.Example^$match-case")
	compiled, err := Compile(parsed)

	if err != nil {
		t.Fatal(err)
	}

	matcher := NewMatcher(compiled)

	if result := matcher.MatchRequest(
		"https://Ads.Example/ad.js",
		"script",
		"https://youtube.com",
	); !result.Matched {
		t.Fatal("expected matching case to be blocked")
	}

	if result := matcher.MatchRequest(
		"https://ads.example/ad.js",
		"script",
		"https://youtube.com",
	); result.Matched {
		t.Fatal("expected different case to be allowed")
	}
}
