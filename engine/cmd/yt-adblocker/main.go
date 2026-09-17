package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"yt-adblocker/engine/internal/filtering"
	"yt-adblocker/engine/internal/logging"
	"yt-adblocker/engine/internal/rules"
	"yt-adblocker/engine/internal/security"
	"yt-adblocker/engine/internal/server"
	"yt-adblocker/engine/internal/storage"
)

const version = "0.1.0"

func resolveRulesPath() string {
	candidates := []string{
		filepath.Join("rules", "youtube", "ads.rules"),
		filepath.Join("..", "rules", "youtube", "ads.rules"),
	}

	if executable, err := os.Executable(); err == nil {
		directory := filepath.Dir(executable)

		candidates = append(candidates,
			filepath.Join(directory, "rules", "youtube", "ads.rules"),
			filepath.Join(directory, "..", "rules", "youtube", "ads.rules"),
		)
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	return filepath.Join("rules", "youtube", "ads.rules")
}

func main() {
	logger := logging.New(nil)

	rulePath := os.Getenv("YT_ADBLOCKER_RULES")

	if rulePath == "" {
		rulePath = resolveRulesPath()
	}

	raw, err := os.ReadFile(rulePath)

	if err != nil {
		logger.Error("failed to load rules: %v", err)
		os.Exit(1)
	}

	parsed := rules.Parse(string(raw))

	cache := rules.NewCache()

	if err := cache.Load(parsed); err != nil {
		logger.Error("failed to compile rules: %v", err)
		os.Exit(1)
	}

	databasePath := os.Getenv("YT_ADBLOCKER_STATE")

	if databasePath == "" {
		databasePath = security.StatePath()
	}

	tokenPath := os.Getenv("YT_ADBLOCKER_TOKEN")

	if tokenPath == "" {
		tokenPath = security.TokenPath()
	}

	authToken, err := security.LoadOrCreateToken(tokenPath)

	if err != nil {
		logger.Error("failed to initialize authentication token: %v", err)
		os.Exit(1)
	}

	database, err := storage.Open(databasePath)

	if err != nil {
		logger.Error("failed to open storage: %v", err)
		os.Exit(1)
	}

	defer database.Close()

	statistics, err := storage.LoadStatistics(database)

	if err != nil {
		logger.Error("failed to load statistics: %v", err)
		os.Exit(1)
	}

	metrics := &logging.Metrics{}
	engine := filtering.NewEngine(cache)

	app := server.New(server.Config{
		Address:   "127.0.0.1:8766",
		Version:   version,
		AuthToken: authToken,
		Rules:     parsed,
		Cache:     cache,
		Engine:    engine,
		Logger:    logger,
		Metrics:   metrics,
		Storage:   statistics,
		Database:  database,
	})

	go func() {
		if err := app.Start(); err != nil && !errors.Is(err, context.Canceled) {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)

	signal.Notify(
		stop,
		os.Interrupt,
		syscall.SIGTERM,
	)

	<-stop

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	if err := app.Shutdown(ctx); err != nil {
		logger.Error("shutdown failed: %v", err)
	}
}
