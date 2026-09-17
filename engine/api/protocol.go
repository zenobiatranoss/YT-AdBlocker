package api

type FilterRequest struct {
	URL       string            `json:"url"`
	Method    string            `json:"method"`
	Resource  string            `json:"resource"`
	Initiator string            `json:"initiator,omitempty"`
	Headers   map[string]string `json:"headers,omitempty"`
}

type FilterResponse struct {
	Blocked   bool   `json:"blocked"`
	Rule      string `json:"rule,omitempty"`
	Reason    string `json:"reason,omitempty"`
	Processed bool   `json:"processed"`
}

type RuleInfo struct {
	Pattern string `json:"pattern"`
	Type    string `json:"type"`
	Domain  string `json:"domain,omitempty"`
}

type RulesResponse struct {
	Count int        `json:"count"`
	Rules []RuleInfo `json:"rules"`
}

type Statistics struct {
	Requests  uint64 `json:"requests"`
	Blocked   uint64 `json:"blocked"`
	Allowed   uint64 `json:"allowed"`
	Responses uint64 `json:"responses"`
	RuleHits  uint64 `json:"rule_hits"`
}

type DetectionEvent struct {
	DetectedAt int64   `json:"detected_at"`
	Confidence float64 `json:"confidence"`
	Source     string  `json:"source"`
}

type StatusResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
	Engine  string `json:"engine"`
	Running bool   `json:"running"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
