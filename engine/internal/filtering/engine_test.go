package filtering

import (
	"testing"

	"yt-adblocker/engine/internal/rules"
)

func TestEngine(t *testing.T) {
	cache := rules.NewCache()

	parsed := rules.Parse(`
||doubleclick.net^
||youtube.com/get_midroll_info
`)

	if err := cache.Load(parsed); err != nil {
		t.Fatal(err)
	}

	engine := NewEngine(cache)

	blocked := engine.Filter(Request{
		URL: "https://ad.doubleclick.net/test",
	})

	if !blocked.Blocked {
		t.Fatal("expected request to be blocked")
	}

	allowed := engine.Filter(Request{
		URL: "https://www.youtube.com/watch?v=test",
	})

	if allowed.Blocked {
		t.Fatal("expected normal YouTube request to be allowed")
	}

	stats := engine.Statistics()

	if stats.Requests != 2 {
		t.Fatalf("expected 2 requests, got %d", stats.Requests)
	}

	if stats.Blocked != 1 {
		t.Fatalf("expected 1 blocked request, got %d", stats.Blocked)
	}
}
