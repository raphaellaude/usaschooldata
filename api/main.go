package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"strings"

	membershipv1 "usa-school-data/api/membership/v1"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/reflectx"
)

//go:embed sql/historical_enrollment.sql
var historicalEnrollmentQuery string

func main() {
	db, err := connect()
	if err != nil {
		panic(err)
	}

	ctx := context.Background()
	ncessch := "370331002181"

	// Query directly into protobuf types using sqlx
	var results []*membershipv1.TotalEnrollment
	err = db.SelectContext(ctx, &results, historicalEnrollmentQuery, ncessch)
	if err != nil {
		log.Fatal(err)
	}

	// Print results
	for _, enrollment := range results {
		log.Printf("school year %s: %d", enrollment.SchoolYear, enrollment.Enrollment)
	}
}

func connect() (*sqlx.DB, error) {
	ctx := context.Background()

	// Use OpenDB to get *sql.DB compatible with sqlx
	sqlDB := clickhouse.OpenDB(&clickhouse.Options{
		// TODO: move to DC and use clickhouse:9000
		Addr: []string{"localhost:19000"},
		Auth: clickhouse.Auth{
			Database: "default",
			Username: "default",
			Password: "your_strong_password",
		},
		ClientInfo: clickhouse.ClientInfo{
			Products: []struct {
				Name    string
				Version string
			}{
				{Name: "usa-school-data", Version: "0.1"},
			},
		},
		Debugf: func(format string, v ...interface{}) {
			fmt.Printf(format, v)
		},
		// TODO: move to DC and use TLS
		// TLS: &tls.Config{
		// 	InsecureSkipVerify: true,
		// },
	})

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
