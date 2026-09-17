package storage

import (
	"path/filepath"
	"testing"
)

func TestDatabasePersistence(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")

	database, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}

	type state struct {
		Enabled bool `json:"enabled"`
		Count   int  `json:"count"`
	}

	expected := state{
		Enabled: true,
		Count:   42,
	}

	if err := database.Set("state", expected); err != nil {
		t.Fatal(err)
	}

	if err := database.Close(); err != nil {
		t.Fatal(err)
	}

	database, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	var actual state

	if err := database.Get("state", &actual); err != nil {
		t.Fatal(err)
	}

	if actual != expected {
		t.Fatalf("expected %+v, got %+v", expected, actual)
	}
}

func TestSettingsDefaults(t *testing.T) {
	database, err := Open(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	settings, err := LoadSettings(database)
	if err != nil {
		t.Fatal(err)
	}

	if !settings.Enabled {
		t.Fatal("expected settings to be enabled by default")
	}

	if !settings.ProtectPlayback {
		t.Fatal("expected playback protection by default")
	}
}

func TestStatistics(t *testing.T) {
	statistics := &Statistics{}

	statistics.RecordRequest(true)
	statistics.RecordRequest(false)
	statistics.RecordResponse()
	statistics.RecordRuleHit()
	statistics.RecordDetection(100)
	statistics.RecordInterruption()
	statistics.RecordRecovery()

	snapshot := statistics.Snapshot()

	if snapshot.Requests != 2 {
		t.Fatalf("expected 2 requests, got %d", snapshot.Requests)
	}

	if snapshot.BlockedRequests != 1 {
		t.Fatalf("expected 1 blocked request, got %d", snapshot.BlockedRequests)
	}

	if snapshot.Detections != 1 {
		t.Fatalf("expected 1 detection, got %d", snapshot.Detections)
	}

	if snapshot.PlaybackRecoveries != 1 {
		t.Fatalf("expected 1 recovery, got %d", snapshot.PlaybackRecoveries)
	}
}
