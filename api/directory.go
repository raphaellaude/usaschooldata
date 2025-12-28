package main

import (
	"context"
	"database/sql"
	_ "embed"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"connectrpc.com/connect"
	"github.com/jmoiron/sqlx"
	directoryv1 "github.com/raphaellaude/usaschooldata/api/directory/v1"
)

//go:embed sql/get_school.sql
var getSchoolQuery string

var nonAlphanumeric = regexp.MustCompile(`[^a-zA-Z0-9]+`)

type DirectoryHandler struct {
	db *sqlx.DB
}

func NewDirectoryHandler(db *sqlx.DB) *DirectoryHandler {
	return &DirectoryHandler{db: db}
}

func (h *DirectoryHandler) GetMatchingSchools(ctx context.Context, req *directoryv1.GetMatchingSchoolsRequest) (*directoryv1.GetMatchingSchoolsResponse, error) {
	// Replace non-alphanumeric characters with spaces, then split into tokens
	normalized := nonAlphanumeric.ReplaceAllString(req.SearchTerm, " ")
	tokens := strings.Fields(normalized)
	if len(tokens) == 0 {
		return nil, connect.NewError(
			connect.CodeInvalidArgument,
			errors.New("search term cannot be empty"),
		)
	}

	// Build dynamic WHERE conditions for each token
	var conditions []string
	args := make(map[string]interface{})
	for i, token := range tokens {
		paramName := fmt.Sprintf("token%d", i)
		conditions = append(conditions, fmt.Sprintf("hasTokenCaseInsensitive(sch_name, :%s)", paramName))
		args[paramName] = token
	}

	// Build the final query with all conditions
	whereClause := strings.Join(conditions, " AND ")
	query := fmt.Sprintf(`SELECT
    ncessch,
    sch_name,
    school_year
FROM "directory"
WHERE school_year_no = 1 AND
    %s
ORDER BY school_year DESC
LIMIT 10 OFFSET 0`, whereClause)

	// Execute query with named parameters
	var results []*directoryv1.SchoolSearch
	namedQuery, namedArgs, err := sqlx.Named(query, args)
	if err != nil {
		return nil, err
	}
	namedQuery = h.db.Rebind(namedQuery)
	err = h.db.SelectContext(ctx, &results, namedQuery, namedArgs...)
	if err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, connect.NewError(
			connect.CodeNotFound,
			errors.New("no results found"),
		)
	}

	return &directoryv1.GetMatchingSchoolsResponse{
		Results: results,
	}, nil
}

func (h *DirectoryHandler) GetSchool(ctx context.Context, req *directoryv1.GetSchoolRequest) (*directoryv1.GetSchoolResponse, error) {
	var results directoryv1.School
	err := h.db.GetContext(ctx, &results, getSchoolQuery, req.Ncessch, req.SchoolYear)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(
				connect.CodeNotFound,
				errors.New("No school found for this school and year"),
			)
		}
		return nil, err
	}

	return &directoryv1.GetSchoolResponse{
		School: &results,
	}, nil
}
