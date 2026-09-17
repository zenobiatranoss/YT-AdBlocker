package storage

import "sync"

type Statistics struct {
	mu                   sync.RWMutex
	Detections           uint64 `json:"detections"`
	InterruptionsBlocked uint64 `json:"interruptions_prevented"`
	PlaybackRecoveries   uint64 `json:"playback_recoveries"`
	Requests             uint64 `json:"requests"`
	BlockedRequests      uint64 `json:"blocked_requests"`
	AllowedRequests      uint64 `json:"allowed_requests"`
	Responses            uint64 `json:"responses"`
	RuleHits             uint64 `json:"rule_hits"`
	LastDetectionAt      int64  `json:"last_detection_at"`
}

const statisticsKey = "statistics"

func LoadStatistics(database *Database) (*Statistics, error) {
	var statistics Statistics

	if err := database.Get(statisticsKey, &statistics); err != nil {
		statistics = Statistics{}
		if err := database.Set(statisticsKey, statistics); err != nil {
			return nil, err
		}
	}

	return &statistics, nil
}

func SaveStatistics(database *Database, statistics *Statistics) error {
	snapshot := statistics.Snapshot()
	return database.Set(statisticsKey, snapshot)
}

func (s *Statistics) RecordRequest(blocked bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.Requests++

	if blocked {
		s.BlockedRequests++
	} else {
		s.AllowedRequests++
	}
}

func (s *Statistics) RecordResponse() {
	s.mu.Lock()
	s.Responses++
	s.mu.Unlock()
}

func (s *Statistics) RecordRuleHit() {
	s.mu.Lock()
	s.RuleHits++
	s.mu.Unlock()
}

func (s *Statistics) RecordDetection(timestamp int64) {
	s.mu.Lock()
	s.Detections++
	s.LastDetectionAt = timestamp
	s.mu.Unlock()
}

func (s *Statistics) RecordInterruption() {
	s.mu.Lock()
	s.InterruptionsBlocked++
	s.mu.Unlock()
}

func (s *Statistics) RecordRecovery() {
	s.mu.Lock()
	s.PlaybackRecoveries++
	s.mu.Unlock()
}

func (s *Statistics) Snapshot() Statistics {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return Statistics{
		Detections:           s.Detections,
		InterruptionsBlocked: s.InterruptionsBlocked,
		PlaybackRecoveries:   s.PlaybackRecoveries,
		Requests:             s.Requests,
		BlockedRequests:      s.BlockedRequests,
		AllowedRequests:      s.AllowedRequests,
		Responses:            s.Responses,
		RuleHits:             s.RuleHits,
		LastDetectionAt:      s.LastDetectionAt,
	}
}
