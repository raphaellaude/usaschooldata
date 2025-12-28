package main

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port               string
	ClickHouseHost     string
	ClickHouseDatabase string
	ClickHouseUsername string
	ClickHousePassword string
	ClickHouseTLS      bool
	CORSAllowedOrigins []string
	Env                string
}

func LoadConfig() *Config {
	return &Config{
		Port:               getEnv("PORT", "8080"),
		ClickHouseHost:     getEnv("CLICKHOUSE_HOST", "localhost:9000"),
		ClickHouseDatabase: getEnv("CLICKHOUSE_DATABASE", "default"),
		ClickHouseUsername: getEnv("CLICKHOUSE_USERNAME", "default"),
		ClickHousePassword: getEnv("CLICKHOUSE_PASSWORD", "your_strong_password"),
		ClickHouseTLS:      getEnvBool("CLICKHOUSE_TLS", false),
		CORSAllowedOrigins: getEnvSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173"}),
		Env:                getEnv("ENV", "development"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return defaultValue
		}
		return parsed
	}
	return defaultValue
}

func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
