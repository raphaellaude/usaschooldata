package main

import (
	"net/http"
	"strings"
)

// isOriginAllowed checks if an origin is in the allowed list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		// Trim whitespace from config
		allowed = strings.TrimSpace(allowed)

		// Allow wildcard
		if allowed == "*" {
			return true
		}

		// Exact match
		if origin == allowed {
			return true
		}
	}
	return false
}

// corsMiddleware is a standard HTTP middleware for handling preflight requests
// This wraps the entire handler to catch OPTIONS requests
func corsMiddleware(allowedOrigins []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin != "" && isOriginAllowed(origin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms")
			w.Header().Set("Access-Control-Expose-Headers", "Connect-Protocol-Version, Connect-Timeout-Ms")
			w.Header().Set("Access-Control-Max-Age", "7200")
		}

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
