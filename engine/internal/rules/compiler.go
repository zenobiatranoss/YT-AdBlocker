package rules

import (
	"regexp"
	"strings"
)

type CompiledRule struct {
	Source   Rule
	Pattern  string
	Regex    *regexp.Regexp
	Contains string
}

func Compile(input []Rule) ([]CompiledRule, error) {
	if err := ValidateAll(input); err != nil {
		return nil, err
	}

	output := make([]CompiledRule, 0, len(input))

	for _, rule := range input {
		compiled := CompiledRule{
			Source:  rule,
			Pattern: rule.Pattern,
		}

		if rule.Regex {
			expression := strings.TrimSuffix(
				strings.TrimPrefix(rule.Pattern, "/"),
				"/",
			)

			re, err := regexp.Compile(expression)
			if err != nil {
				return nil, err
			}

			compiled.Regex = re
		} else {
			pattern := rule.Pattern
			pattern = strings.TrimPrefix(pattern, "||")
			pattern = strings.Trim(pattern, "|")
			pattern = strings.ReplaceAll(pattern, "^", "")
			pattern = strings.ReplaceAll(pattern, "*", "")

			if rule.MatchCase {
				compiled.Contains = pattern
			} else {
				compiled.Contains = strings.ToLower(pattern)
			}
		}

		output = append(output, compiled)
	}

	return output, nil
}
