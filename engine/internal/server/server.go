package server

import (
	"context"
	"net/http"
	"time"

	"yt-adblocker/engine/internal/filtering"
	"yt-adblocker/engine/internal/logging"
	"yt-adblocker/engine/internal/rules"
	"yt-adblocker/engine/internal/storage"
)

type Logger interface {
	Info(string, ...any)
	Warn(string, ...any)
	Error(string, ...any)
}

type Config struct {
	Address   string
	Version   string
	AuthToken string
	Rules     []rules.Rule
	Cache     *rules.Cache
	Engine    *filtering.Engine
	Logger    Logger
	Metrics   *logging.Metrics
	Storage   *storage.Statistics
	Database  *storage.Database
}

type Server struct {
	httpServer *http.Server
	version    string
	authToken  string
	rules      []rules.Rule
	cache      *rules.Cache
	engine     *filtering.Engine
	logger     Logger
	metrics    *logging.Metrics
	statistics *storage.Statistics
	database   *storage.Database
	events     *EventHub
	stop       chan struct{}
	done       chan struct{}
}

func New(config Config) *Server {
	logger := config.Logger

	if logger == nil {
		logger = logging.New(nil)
	}

	metrics := config.Metrics

	if metrics == nil {
		metrics = &logging.Metrics{}
	}

	statistics := config.Storage

	if statistics == nil {
		statistics = &storage.Statistics{}
	}

	events := NewEventHub()

	server := &Server{
		version:    config.Version,
		authToken:  config.AuthToken,
		rules:      config.Rules,
		cache:      config.Cache,
		engine:     config.Engine,
		logger:     logger,
		metrics:    metrics,
		statistics: statistics,
		database:   config.Database,
		events:     events,
		stop:       make(chan struct{}),
		done:       make(chan struct{}),
	}

	server.httpServer = &http.Server{
		Addr:              config.Address,
		Handler:           server.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go server.persistenceLoop()

	return server
}

func (s *Server) Start() error {
	s.logger.Info("server listening on %s", s.httpServer.Addr)
	return s.httpServer.ListenAndServe()
}

func (s *Server) persistenceLoop() {
	defer close(s.done)

	if s.database == nil {
		return
	}

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := storage.SaveStatistics(s.database, s.statistics); err != nil {
				s.logger.Error("failed to persist statistics: %v", err)
			}

		case <-s.stop:
			return
		}
	}
}

func (s *Server) Shutdown(ctx context.Context) error {
	close(s.stop)

	select {
	case <-s.done:
	case <-ctx.Done():
		return ctx.Err()
	}

	if s.database != nil {
		if err := storage.SaveStatistics(s.database, s.statistics); err != nil {
			s.logger.Error("failed to persist statistics during shutdown: %v", err)
		}
	}

	s.events.Close()

	return s.httpServer.Shutdown(ctx)
}
