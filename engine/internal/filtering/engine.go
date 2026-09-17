package filtering

import (
	"sync/atomic"

	"yt-adblocker/engine/internal/rules"
)

type Statistics struct {
	Requests  atomic.Uint64
	Blocked   atomic.Uint64
	Allowed   atomic.Uint64
	Responses atomic.Uint64
	RuleHits  atomic.Uint64
}

type Decision struct {
	Blocked   bool
	Rule      string
	Processed bool
	Reason    string
}

type Engine struct {
	matcher *Matcher
	stats   Statistics
}

func NewEngine(cache *rules.Cache) *Engine {
	return &Engine{
		matcher: NewMatcher(cache),
	}
}

func (e *Engine) Filter(request Request) Decision {
	e.stats.Requests.Add(1)

	if !request.Valid() {
		e.stats.Allowed.Add(1)

		return Decision{
			Processed: true,
			Reason:    "invalid-request-allowed",
		}
	}

	blocked, rule := e.matcher.Match(request)

	if blocked {
		e.stats.Blocked.Add(1)
		e.stats.RuleHits.Add(1)

		return Decision{
			Blocked:   true,
			Rule:      rule,
			Processed: true,
			Reason:    "matched-network-rule",
		}
	}

	e.stats.Allowed.Add(1)

	return Decision{
		Processed: true,
		Reason:    "no-matching-rule",
	}
}

func (e *Engine) ProcessResponse(response Response) ResponseDecision {
	e.stats.Responses.Add(1)

	return ResponseDecision{
		Blocked: false,
		Reason:  "response-allowed",
	}
}

func (e *Engine) Statistics() StatisticsSnapshot {
	return StatisticsSnapshot{
		Requests:  e.stats.Requests.Load(),
		Blocked:   e.stats.Blocked.Load(),
		Allowed:   e.stats.Allowed.Load(),
		Responses: e.stats.Responses.Load(),
		RuleHits:  e.stats.RuleHits.Load(),
	}
}

type StatisticsSnapshot struct {
	Requests  uint64
	Blocked   uint64
	Allowed   uint64
	Responses uint64
	RuleHits  uint64
}
