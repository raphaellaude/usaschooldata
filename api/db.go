package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/reflectx"
	"go.uber.org/zap"
)

func connectDB(cfg *Config, logger *zap.Logger) (*sqlx.DB, error) {
	ctx := context.Background()

	opts := &clickhouse.Options{
		Addr:     []string{cfg.ClickHouseHost},
		Protocol: clickhouse.Native, // Use native protocol for ClickHouse Cloud
		Auth: clickhouse.Auth{
			Database: cfg.ClickHouseDatabase,
			Username: cfg.ClickHouseUsername,
			Password: cfg.ClickHousePassword,
		},
		ClientInfo: clickhouse.ClientInfo{
			Products: []struct {
				Name    string
				Version string
			}{
				{Name: "usa-school-data", Version: "0.1"},
			},
		},
	}

	// Enable TLS for ClickHouse Cloud (secure native TCP on port 9440)
	if cfg.ClickHouseTLS {
		tlsConfig := &tls.Config{
			MinVersion: tls.VersionTLS12,
		}

		// Only skip verification in local development (not recommended for production)
		if cfg.Env == "development" {
			tlsConfig.InsecureSkipVerify = true
			logger.Warn("TLS certificate verification disabled (development mode)")
		}

		opts.TLS = tlsConfig
	}

	// Enable debug logging in development
	if cfg.Env == "development" {
		opts.Debugf = func(format string, v ...interface{}) {
			fmt.Printf(format, v)
		}
	}

	sqlDB := clickhouse.OpenDB(opts)

	// Configure connection pooling
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := sqlDB.PingContext(ctx); err != nil {
		if exception, ok := err.(*clickhouse.Exception); ok {
			logger.Error("ClickHouse connection failed",
				zap.Int32("code", exception.Code),
				zap.String("message", exception.Message),
				zap.String("stackTrace", exception.StackTrace),
			)
		}
		return nil, err
	}

	logger.Info("Connected to ClickHouse",
		zap.String("host", cfg.ClickHouseHost),
		zap.String("database", cfg.ClickHouseDatabase),
	)

	// Wrap with sqlx and configure to use JSON tags for mapping
	db := sqlx.NewDb(sqlDB, "clickhouse")
	db.Mapper = reflectx.NewMapperFunc("json", strings.ToLower)

	return db, nil
}
