package logging

import "sync/atomic"

type Metrics struct {
	requests      atomic.Uint64
	blocked       atomic.Uint64
	allowed       atomic.Uint64
	responses     atomic.Uint64
	ruleHits      atomic.Uint64
	detections    atomic.Uint64
	recoveries    atomic.Uint64
	interruptions atomic.Uint64
}

type Snapshot struct {
	Requests             uint64 `json:"requests"`
	Blocked              uint64 `json:"blocked"`
	Allowed              uint64 `json:"allowed"`
	Responses            uint64 `json:"responses"`
	RuleHits             uint64 `json:"rule_hits"`
	Detections           uint64 `json:"detections"`
	Recoveries           uint64 `json:"recoveries"`
	InterruptionsBlocked uint64 `json:"interruptions_prevented"`
}

func (m *Metrics) Request(blocked bool) {
	m.requests.Add(1)

	if blocked {
		m.blocked.Add(1)
	} else {
		m.allowed.Add(1)
	}
}

func (m *Metrics) Response() {
	m.responses.Add(1)
}

func (m *Metrics) RuleHit() {
	m.ruleHits.Add(1)
}

func (m *Metrics) Detection() {
	m.detections.Add(1)
}

func (m *Metrics) Recovery() {
	m.recoveries.Add(1)
}

func (m *Metrics) Interruption() {
	m.interruptions.Add(1)
}

func (m *Metrics) Snapshot() Snapshot {
	return Snapshot{
		Requests:             m.requests.Load(),
		Blocked:              m.blocked.Load(),
		Allowed:              m.allowed.Load(),
		Responses:            m.responses.Load(),
		RuleHits:             m.ruleHits.Load(),
		Detections:           m.detections.Load(),
		Recoveries:           m.recoveries.Load(),
		InterruptionsBlocked: m.interruptions.Load(),
	}
}
