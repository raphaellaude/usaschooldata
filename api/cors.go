package main

import (
	"net/http"

	"github.com/rs/cors"
)

func corsMiddleware(allowedOrigins []string, next http.Handler) http.Handler {
	corsHandler := cors.New(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Connect-Protocol-Version", "Connect-Timeout-Ms"},
		ExposedHeaders: []string{"Connect-Protocol-Version", "Connect-Timeout-Ms"},
		MaxAge:         7200,
	})

	return corsHandler.Handler(next)
}
