package rules

import (
	"fmt"
	"strings"
)

func Validate(rule Rule) error {
	if strings.TrimSpace(rule.Pattern) == "" {
		return fmt.Errorf("empty rule pattern")
	}

	switch rule.Type {
	case NetworkRule, CosmeticRule, ExceptionRule:
	default:
		return fmt.Errorf("unsupported rule type: %s", rule.Type)
	}

	if rule.Regex {
		if len(rule.Pattern) < 3 {
			return fmt.Errorf("invalid regex rule")
		}

		if rule.Pattern[0] != '/' {
			return fmt.Errorf("regex rule must start with /")
		}
	}

	return nil
}

func ValidateAll(rules []Rule) error {
	for index, rule := range rules {
		if err := Validate(rule); err != nil {
			return fmt.Errorf("rule %d: %w", index, err)
		}
	}

	return nil
}
