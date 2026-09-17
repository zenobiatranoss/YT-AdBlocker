package rules

import (
	"strings"
)

type RuleType string

const (
	NetworkRule   RuleType = "network"
	CosmeticRule  RuleType = "cosmetic"
	ExceptionRule RuleType = "exception"
)

type Rule struct {
	Pattern         string
	Type            RuleType
	Domain          string
	Regex           bool
	Blocking        bool
	ResourceTypes   []string
	ExcludedTypes   []string
	Domains         []string
	ExcludedDomains []string
	ThirdParty      *bool
	MatchCase       bool
}

func Parse(input string) []Rule {
	lines := strings.Split(strings.ReplaceAll(input, "\r\n", "\n"), "\n")
	result := make([]Rule, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)

		if line == "" || strings.HasPrefix(line, "!") {
			continue
		}

		rule := parseLine(line)

		if rule.Pattern != "" {
			result = append(result, rule)
		}
	}

	return result
}

func parseLine(line string) Rule {
	if strings.HasPrefix(line, "/") && strings.LastIndex(line, "/") > 0 {
		return parseNetworkRule(line, true)
	}

	if strings.HasPrefix(line, "@@") {
		rule := parseNetworkRule(strings.TrimPrefix(line, "@@"), false)
		rule.Type = ExceptionRule
		return rule
	}

	if strings.Contains(line, "##") {
		parts := strings.SplitN(line, "##", 2)

		return Rule{
			Pattern:  parts[1],
			Type:     CosmeticRule,
			Domain:   strings.TrimSpace(parts[0]),
			Blocking: true,
		}
	}

	return parseNetworkRule(line, true)
}

func parseNetworkRule(line string, blocking bool) Rule {
	pattern, options := splitOptions(line)

	rule := Rule{
		Pattern:  pattern,
		Type:     NetworkRule,
		Domain:   extractDomain(pattern),
		Regex:    strings.HasPrefix(pattern, "/") && strings.LastIndex(pattern, "/") > 0,
		Blocking: blocking,
	}

	parseOptions(&rule, options)

	return rule
}

func splitOptions(line string) (string, string) {
	index := strings.LastIndex(line, "$")

	if index <= 0 {
		return line, ""
	}

	if strings.HasPrefix(line, "/") {
		lastSlash := strings.LastIndex(line, "/")
		if lastSlash >= index {
			return line, ""
		}
	}

	return line[:index], line[index+1:]
}

func parseOptions(rule *Rule, options string) {
	if options == "" {
		return
	}

	for _, option := range strings.Split(options, ",") {
		option = strings.TrimSpace(strings.ToLower(option))

		if option == "" {
			continue
		}

		switch option {
		case "third-party":
			value := true
			rule.ThirdParty = &value
			continue

		case "~third-party":
			value := false
			rule.ThirdParty = &value
			continue

		case "match-case":
			rule.MatchCase = true
			continue
		}

		if strings.HasPrefix(option, "domain=") {
			parseDomains(rule, strings.TrimPrefix(option, "domain="))
			continue
		}

		if strings.HasPrefix(option, "~") {
			typeName := strings.TrimPrefix(option, "~")

			if isResourceType(typeName) {
				rule.ExcludedTypes = appendUnique(rule.ExcludedTypes, typeName)
			}

			continue
		}

		if isResourceType(option) {
			rule.ResourceTypes = appendUnique(rule.ResourceTypes, option)
		}
	}
}

func parseDomains(rule *Rule, value string) {
	for _, domain := range strings.Split(value, "|") {
		domain = strings.TrimSpace(strings.ToLower(domain))

		if domain == "" {
			continue
		}

		if strings.HasPrefix(domain, "~") {
			domain = strings.TrimPrefix(domain, "~")

			if domain != "" {
				rule.ExcludedDomains = appendUnique(
					rule.ExcludedDomains,
					domain,
				)
			}

			continue
		}

		rule.Domains = appendUnique(rule.Domains, domain)
	}
}

func appendUnique(values []string, value string) []string {
	for _, existing := range values {
		if existing == value {
			return values
		}
	}

	return append(values, value)
}

func isResourceType(value string) bool {
	switch value {
	case
		"script",
		"image",
		"media",
		"xhr",
		"xmlhttprequest",
		"document",
		"subdocument",
		"stylesheet",
		"font",
		"websocket",
		"ping",
		"object",
		"other",
		"beacon",
		"csp_report",
		"object_subrequest":
		return true
	default:
		return false
	}
}

func extractDomain(pattern string) string {
	value := pattern

	if strings.HasPrefix(value, "||") {
		value = value[2:]
	}

	value = strings.TrimPrefix(value, "*://")
	value = strings.TrimPrefix(value, "https://")
	value = strings.TrimPrefix(value, "http://")

	for _, separator := range []string{"/", "^", "*", "|"} {
		if index := strings.Index(value, separator); index >= 0 {
			value = value[:index]
		}
	}

	return strings.ToLower(strings.TrimSpace(value))
}
