package security

import (
	"net"
	"net/http"
	"strings"
)

func IsLoopbackHost(host string) bool {
	host = strings.TrimSpace(host)

	if host == "" {
		return false
	}

	if strings.EqualFold(host, "localhost") {
		return true
	}

	parsed := net.ParseIP(host)
	return parsed != nil && parsed.IsLoopback()
}

func IsAllowedOrigin(origin string) bool {
	origin = strings.TrimSpace(origin)

	if origin == "" {
		return true
	}

	if strings.EqualFold(origin, "null") {
		return true
	}

	if strings.HasPrefix(strings.ToLower(origin), "moz-extension://") {
		return true
	}

	if strings.HasPrefix(strings.ToLower(origin), "http://127.0.0.1:") {
		return true
	}

	if strings.HasPrefix(strings.ToLower(origin), "http://localhost:") {
		return true
	}

	return false
}

func ValidateRequest(r *http.Request, allowedMethods ...string) bool {
	if r == nil {
		return false
	}

	if !IsLoopbackHost(requestHost(r)) {
		return false
	}

	if !IsAllowedOrigin(r.Header.Get("Origin")) {
		return false
	}

	if len(allowedMethods) == 0 {
		return true
	}

	for _, method := range allowedMethods {
		if r.Method == method {
			return true
		}
	}

	return false
}

func requestHost(r *http.Request) string {
	host := r.Host

	if host == "" {
		host = r.URL.Hostname()
	}

	if hostName, _, err := net.SplitHostPort(host); err == nil {
		return hostName
	}

	return strings.Trim(host, "[]")
}
