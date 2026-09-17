package server

import (
	"encoding/json"
	"net/http"

	"yt-adblocker/engine/api"
	"yt-adblocker/engine/internal/filtering"
	"yt-adblocker/engine/internal/storage"
)

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/api/v1/status", s.status)
	mux.HandleFunc("/api/v1/filter", s.filter)
	mux.HandleFunc("/api/v1/rules", s.rulesHandler)
	mux.HandleFunc("/api/v1/stats", s.stats)
	mux.HandleFunc("/api/v1/events/detection", s.detectionEvent)
	mux.HandleFunc("/api/v1/events/interruption", s.interruptionEvent)
	mux.HandleFunc("/api/v1/events/recovery", s.recoveryEvent)
	mux.HandleFunc("/api/v1/ws", s.websocket)

	handler := jsonMiddleware(mux)
	handler = authMiddleware(handler, s.authToken)
	handler = requestLogger(handler, s.logger)

	return handler
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "yt-adblocker-engine",
		"version": s.version,
	})
}

func (s *Server) status(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, api.StatusResponse{
		Status:  "running",
		Version: s.version,
		Engine:  "go",
		Running: true,
	})
}

func (s *Server) filter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, api.ErrorResponse{
			Error: "method not allowed",
		})
		return
	}

	var input api.FilterRequest

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: "invalid JSON",
		})
		return
	}

	decision := s.engine.Filter(filterRequest(input))

	s.metrics.Request(decision.Blocked)
	s.statistics.RecordRequest(decision.Blocked)

	if decision.Blocked {
		s.metrics.RuleHit()
		s.statistics.RecordRuleHit()

		s.events.Publish(Event{
			Type: "request-blocked",
			Data: map[string]any{
				"url":  input.URL,
				"rule": decision.Rule,
			},
		})
	}

	if s.database != nil {
		if err := storage.SaveStatistics(s.database, s.statistics); err != nil {
			s.logger.Error("failed to persist request statistics: %v", err)
		}
	}

	writeJSON(w, http.StatusOK, api.FilterResponse{
		Blocked:   decision.Blocked,
		Rule:      decision.Rule,
		Reason:    decision.Reason,
		Processed: decision.Processed,
	})
}

func (s *Server) detectionEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, api.ErrorResponse{
			Error: "method not allowed",
		})
		return
	}

	var event api.DetectionEvent

	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: "invalid JSON",
		})
		return
	}

	if event.DetectedAt <= 0 {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: "invalid detection timestamp",
		})
		return
	}

	s.metrics.Detection()
	s.statistics.RecordDetection(event.DetectedAt)

	s.events.Publish(Event{
		Type: "detection",
		Data: map[string]any{
			"detected_at": event.DetectedAt,
			"confidence":  event.Confidence,
			"source":      event.Source,
		},
	})

	persistStatistics(s)

	writeJSON(w, http.StatusOK, map[string]any{
		"recorded": true,
	})
}

func (s *Server) interruptionEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, api.ErrorResponse{
			Error: "method not allowed",
		})
		return
	}

	s.metrics.Interruption()
	s.statistics.RecordInterruption()

	s.events.Publish(Event{
		Type: "interruption-prevented",
	})

	persistStatistics(s)

	writeJSON(w, http.StatusOK, map[string]any{
		"recorded": true,
	})
}

func (s *Server) recoveryEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, api.ErrorResponse{
			Error: "method not allowed",
		})
		return
	}

	s.metrics.Recovery()
	s.statistics.RecordRecovery()

	s.events.Publish(Event{
		Type: "playback-recovery",
	})

	persistStatistics(s)

	writeJSON(w, http.StatusOK, map[string]any{
		"recorded": true,
	})
}

func (s *Server) rulesHandler(w http.ResponseWriter, r *http.Request) {
	output := make([]api.RuleInfo, 0, len(s.rules))

	for _, rule := range s.rules {
		output = append(output, api.RuleInfo{
			Pattern: rule.Pattern,
			Type:    string(rule.Type),
			Domain:  rule.Domain,
		})
	}

	writeJSON(w, http.StatusOK, api.RulesResponse{
		Count: len(output),
		Rules: output,
	})
}

func (s *Server) stats(w http.ResponseWriter, r *http.Request) {
	metrics := s.metrics.Snapshot()
	persisted := s.statistics.Snapshot()

	writeJSON(w, http.StatusOK, map[string]any{
		"runtime":    metrics,
		"persistent": persisted,
	})
}

func filterRequest(input api.FilterRequest) filtering.Request {
	return filtering.Request{
		URL:       input.URL,
		Method:    input.Method,
		Resource:  input.Resource,
		Initiator: input.Initiator,
		Headers:   input.Headers,
	}
}

func persistStatistics(s *Server) {
	if s.database == nil {
		return
	}

	if err := storage.SaveStatistics(s.database, s.statistics); err != nil {
		s.logger.Error("failed to persist statistics: %v", err)
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
