package filtering

import (
	"strings"
)

type Request struct {
	URL       string
	Method    string
	Resource  string
	Initiator string
	Headers   map[string]string
}

func (r Request) Valid() bool {
	return strings.TrimSpace(r.URL) != ""
}
