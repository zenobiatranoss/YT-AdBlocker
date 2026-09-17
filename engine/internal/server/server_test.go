package server

import (
	"net/http/httptest"
	"testing"

	"yt-adblocker/engine/internal/filtering"
	"yt-adblocker/engine/internal/logging"
	"yt-adblocker/engine/internal/rules"
	"yt-adblocker/engine/internal/storage"
)

func TestHealth(t *testing.T) {
	cache := rules.NewCache()

	parsed := rules.Parse("||doubleclick.net^")

	if err := cache.Load(parsed); err != nil {
		t.Fatal(err)
	}

	s := New(Config{
		Address: "127.0.0.1:0",
		Version: "0.1.0",
		Rules:   parsed,
		Cache:   cache,
		Engine:  filtering.NewEngine(cache),
		Logger:  logging.New(nil),
		Metrics: &logging.Metrics{},
		Storage: &storage.Statistics{},
	})

	req := httptest.NewRequest("GET", "/health", nil)
	res := httptest.NewRecorder()

	s.routes().ServeHTTP(res, req)

	if res.Code != 200 {
		t.Fatalf("expected 200, got %d", res.Code)
	}
}
