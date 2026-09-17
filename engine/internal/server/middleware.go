package server

import (
	"net/http"
	"strings"

	"yt-adblocker/engine/internal/security"
)

func jsonMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func requestLogger(next http.Handler, logger Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Info("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func authMiddleware(next http.Handler, token string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		if !strings.HasPrefix(r.URL.Path, "/api/v1/") {
			next.ServeHTTP(w, r)
			return
		}

		authorization := strings.TrimSpace(r.Header.Get("Authorization"))
		const prefix = "Bearer "

		if !strings.HasPrefix(authorization, prefix) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{
				"error": "authentication required",
			})
			return
		}

		provided := strings.TrimSpace(strings.TrimPrefix(authorization, prefix))

		if !security.ValidateToken(token, provided) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{
				"error": "invalid authentication token",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}
