package rules

import "testing"

func TestParse(t *testing.T) {
	input := `
! comment
||doubleclick.net^
||youtube.com/get_midroll_info
@@||example.com^
youtube.com##.video-ads
`

	result := Parse(input)

	if len(result) != 4 {
		t.Fatalf("expected 4 rules, got %d", len(result))
	}

	if result[0].Type != NetworkRule {
		t.Fatalf("expected network rule")
	}

	if result[2].Type != ExceptionRule {
		t.Fatalf("expected exception rule")
	}

	if result[3].Type != CosmeticRule {
		t.Fatalf("expected cosmetic rule")
	}
}
