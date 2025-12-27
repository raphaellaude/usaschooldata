package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"connectrpc.com/connect"
	"github.com/raphaellaude/usaschooldata/api/membership/v1/membershipv1connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	// Load configuration
	cfg := LoadConfig()

	// Connect to database
	db, err := connectDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Create handler
	handler := NewMembershipHandler(db)

	// CORS configuration for Connect
	corsOptions := connect.WithInterceptors(newCORSInterceptor(cfg.CORSAllowedOrigins))

	// Register Connect service with CORS
	mux := http.NewServeMux()
	path, serviceHandler := membershipv1connect.NewMembershipServiceHandler(handler, corsOptions)
	mux.Handle(path, serviceHandler)

	// Wrap with CORS middleware to handle OPTIONS preflight requests
	corsHandler := corsMiddleware(cfg.CORSAllowedOrigins, mux)

	// Serve with HTTP/2 (h2c for unencrypted HTTP/2)
	addr := ":" + cfg.Port
	server := &http.Server{
		Addr:         addr,
		Handler:      h2c.NewHandler(corsHandler, &http2.Server{}),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on %s (env: %s)", addr, cfg.Env)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
