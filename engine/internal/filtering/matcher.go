package filtering

import (
	"yt-adblocker/engine/internal/rules"
)

type Matcher struct {
	cache *rules.Cache
}

func NewMatcher(cache *rules.Cache) *Matcher {
	return &Matcher{cache: cache}
}

func (m *Matcher) Match(request Request) (bool, string) {
	result := m.cache.MatchRequest(
		request.URL,
		request.Resource,
		request.Initiator,
	)
عير
	if !result.Matched || result.Rule == nil {
		return false, ""
	}

	return true, result.Rule.Pattern
}
