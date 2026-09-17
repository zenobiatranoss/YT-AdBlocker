package rules

import (
	"sync"
)

type Cache struct {
	mu      sync.RWMutex
	matcher *Matcher
	count   int
}

func NewCache() *Cache {
	return &Cache{}
}

func (c *Cache) Load(rules []Rule) error {
	compiled, err := Compile(rules)
	if err != nil {
		return err
	}

	matcher := NewMatcher(compiled)

	c.mu.Lock()
	c.matcher = matcher
	c.count = len(compiled)
	c.mu.Unlock()

	return nil
}

func (c *Cache) Match(target string) MatchResult {
	return c.MatchRequest(target, "", "")
}

func (c *Cache) MatchRequest(
	target string,
	resource string,
	initiator string,
) MatchResult {
	c.mu.RLock()
	matcher := c.matcher
	c.mu.RUnlock()

	if matcher == nil {
		return MatchResult{}
	}

	return matcher.MatchRequest(
		target,
		resource,
		initiator,
	)
}

func (c *Cache) Count() int {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return c.count
}
