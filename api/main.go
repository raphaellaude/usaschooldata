package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"connectrpc.com/connect"
	"github.com/raphaellaude/usaschooldata/api/membership/v1/membershipv1connect"
	"go.uber.org/zap"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	// Load configuration
	cfg := LoadConfig()

	// Initialize logger
	logger, err := NewLogger(cfg.Env)
	if err != nil {
		panic(err)
	}
	defer func() { _ = logger.Sync() }()

	// Connect to database
	db, err := connectDB(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}

	// Create handler
	handler := NewMembershipHandler(db)

	// CORS configuration for Connect
	corsOptions := connect.WithInterceptors(newCORSInterceptor(cfg.CORSAllowedOrigins))

	// Register Connect service with CORS
	mux := http.NewServeMux()
	path, serviceHandler := membershipv1connect.NewMembershipServiceHandler(handler, corsOptions)
	mux.Handle(path, serviceHandler)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// Check database connectivity
		if err := db.PingContext(r.Context()); err != nil {
			http.Error(w, "Database unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

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
		logger.Info("Starting server",
			zap.String("address", addr),
			zap.String("env", cfg.Env),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
