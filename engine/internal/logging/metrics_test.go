package logging

import "testing"

func TestMetrics(t *testing.T) {
	metrics := &Metrics{}

	metrics.Request(true)
	metrics.Request(false)
	metrics.Response()
	metrics.RuleHit()
	metrics.Detection()
	metrics.Recovery()
	metrics.Interruption()

	snapshot := metrics.Snapshot()

	if snapshot.Requests != 2 {
		t.Fatalf("expected 2 requests, got %d", snapshot.Requests)
	}

	if snapshot.Blocked != 1 {
		t.Fatalf("expected 1 blocked request, got %d", snapshot.Blocked)
	}

	if snapshot.Allowed != 1 {
		t.Fatalf("expected 1 allowed request, got %d", snapshot.Allowed)
	}

	if snapshot.RuleHits != 1 {
		t.Fatalf("expected 1 rule hit, got %d", snapshot.RuleHits)
	}
}
