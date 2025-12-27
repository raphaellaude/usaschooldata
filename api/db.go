package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/reflectx"
)

func connectDB(cfg *Config) (*sqlx.DB, error) {
	ctx := context.Background()

	opts := &clickhouse.Options{
		Addr: []string{cfg.ClickHouseHost},
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

	// Enable TLS if configured
	if cfg.ClickHouseTLS {
		opts.TLS = &tls.Config{
			InsecureSkipVerify: false,
		}
	}

	// Enable debug logging in development
	if cfg.Env == "development" {
		opts.Debugf = func(format string, v ...interface{}) {
			fmt.Printf(format, v)
		}
	}

	sqlDB := clickhouse.OpenDB(opts)

	if err := sqlDB.PingContext(ctx); err != nil {
		if exception, ok := err.(*clickhouse.Exception); ok {
			fmt.Printf("Exception [%d] %s \n%s\n", exception.Code, exception.Message, exception.StackTrace)
		}
		return nil, err
	}

	// Wrap with sqlx and configure to use JSON tags for mapping
	db := sqlx.NewDb(sqlDB, "clickhouse")
	db.Mapper = reflectx.NewMapperFunc("json", strings.ToLower)

	return db, nil
}
