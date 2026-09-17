package rules

import (
	"net/url"
	"strings"
)

type MatchResult struct {
	Matched bool
	Rule    *CompiledRule
}

type Matcher struct {
	rules []CompiledRule
}

func NewMatcher(rules []CompiledRule) *Matcher {
	return &Matcher{rules: rules}
}

func (m *Matcher) Match(target string) MatchResult {
	return m.MatchRequest(target, "", "")
}

func (m *Matcher) MatchRequest(
	target string,
	resource string,
	initiator string,
) MatchResult {
	parsed, err := url.Parse(target)

	if err != nil {
		return MatchResult{}
	}

	host := strings.ToLower(parsed.Hostname())

	for index := range m.rules {
		rule := &m.rules[index]

		if rule.Source.Type != ExceptionRule {
			continue
		}

		if matches(rule, target, host, resource, initiator) {
			return MatchResult{}
		}
	}

	for index := range m.rules {
		rule := &m.rules[index]

		if rule.Source.Type != NetworkRule ||
			!rule.Source.Blocking {
			continue
		}

		if matches(rule, target, host, resource, initiator) {
			return MatchResult{
				Matched: true,
				Rule:    rule,
			}
		}
	}

	return MatchResult{}
}

func matches(
	rule *CompiledRule,
	target string,
	host string,
	resource string,
	initiator string,
) bool {
	if !matchesResource(rule.Source, resource) {
		return false
	}

	if !matchesDomainContext(
		rule.Source,
		host,
		initiator,
	) {
		return false
	}

	if rule.Regex != nil {
		return rule.Regex.MatchString(target)
	}

	if rule.Contains == "" {
		return false
	}

	if rule.Source.MatchCase {
		return strings.Contains(target, rule.Contains)
	}

	return strings.Contains(
		strings.ToLower(target),
		rule.Contains,
	)
}

func matchesResource(
	rule Rule,
	resource string,
) bool {
	resource = normalizeResource(resource)

	if len(rule.ResourceTypes) == 0 &&
		len(rule.ExcludedTypes) == 0 {
		return true
	}

	for _, excluded := range rule.ExcludedTypes {
		if resourceMatches(resource, excluded) {
			return false
		}
	}

	if len(rule.ResourceTypes) == 0 {
		return true
	}

	for _, allowed := range rule.ResourceTypes {
		if resourceMatches(resource, allowed) {
			return true
		}
	}

	return false
}

func resourceMatches(actual, expected string) bool {
	actual = normalizeResource(actual)
	expected = normalizeResource(expected)

	if actual == expected {
		return true
	}

	if expected == "xhr" && actual == "xmlhttprequest" {
		return true
	}

	if expected == "xmlhttprequest" && actual == "xhr" {
		return true
	}

	return false
}

func normalizeResource(resource string) string {
	switch strings.ToLower(strings.TrimSpace(resource)) {
	case "main_frame":
		return "document"
	case "sub_frame":
		return "subdocument"
	case "xmlhttprequest":
		return "xhr"
	default:
		return strings.ToLower(strings.TrimSpace(resource))
	}
}

func matchesDomainContext(
	rule Rule,
	targetHost string,
	initiator string,
) bool {
	initiatorHost := hostname(initiator)

	if len(rule.Domains) > 0 {
		matched := false

		for _, domain := range rule.Domains {
			if hostMatchesDomain(initiatorHost, domain) {
				matched = true
				break
			}
		}

		if !matched {
			return false
		}
	}

	for _, domain := range rule.ExcludedDomains {
		if hostMatchesDomain(initiatorHost, domain) {
			return false
		}
	}

	if rule.ThirdParty != nil {
		thirdParty := isThirdParty(targetHost, initiatorHost)

		if thirdParty != *rule.ThirdParty {
			return false
		}
	}

	return true
}

func hostname(value string) string {
	value = strings.TrimSpace(value)

	if value == "" {
		return ""
	}

	if parsed, err := url.Parse(value); err == nil &&
		parsed.Hostname() != "" {
		return strings.ToLower(parsed.Hostname())
	}

	return strings.ToLower(value)
}

func hostMatchesDomain(host, domain string) bool {
	host = strings.TrimSuffix(strings.ToLower(host), ".")
	domain = strings.TrimSuffix(strings.ToLower(domain), ".")

	if host == "" || domain == "" {
		return false
	}

	return host == domain ||
		strings.HasSuffix(host, "."+domain)
}

func isThirdParty(targetHost, initiatorHost string) bool {
	if targetHost == "" || initiatorHost == "" {
		return true
	}

	if hostMatchesDomain(targetHost, initiatorHost) ||
		hostMatchesDomain(initiatorHost, targetHost) {
		return false
	}

	targetRoot := registrableDomain(targetHost)
	initiatorRoot := registrableDomain(initiatorHost)

	return targetRoot != initiatorRoot
}

func registrableDomain(host string) string {
	parts := strings.Split(strings.TrimSuffix(host, "."), ".")

	if len(parts) <= 2 {
		return host
	}

	return strings.Join(parts[len(parts)-2:], ".")
}
