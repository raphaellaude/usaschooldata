package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

//go:embed sql/historical_enrollment.sql
var historicalEnrollmentQuery string

func main() {
	conn, err := connect()
	if err != nil {
		panic(err)
	}

	ctx := context.Background()
	ncessch := "370331002181"
	rows, err := conn.Query(ctx, historicalEnrollmentQuery, ncessch)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var schoolYear string
		var totalEnrollment int64
		if err := rows.Scan(&schoolYear, &totalEnrollment); err != nil {
			log.Fatal(err)
		}
		log.Printf("school year %s: %d", schoolYear, totalEnrollment)
	}

	// NOTE: Do not skip rows.Err() check
	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}
}

func connect() (driver.Conn, error) {
	var (
		ctx       = context.Background()
		conn, err = clickhouse.Open(&clickhouse.Options{
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
	)

	if err != nil {
		return nil, err
	}

	if err := conn.Ping(ctx); err != nil {
		if exception, ok := err.(*clickhouse.Exception); ok {
			fmt.Printf("Exception [%d] %s \n%s\n", exception.Code, exception.Message, exception.StackTrace)
		}
		return nil, err
	}
	return conn, nil
}
