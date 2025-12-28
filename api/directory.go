package main

import (
	"context"
	_ "embed"
	"errors"

	"connectrpc.com/connect"
	"github.com/jmoiron/sqlx"
	directoryv1 "github.com/raphaellaude/usaschooldata/api/directory/v1"
)

//go:embed sql/search_directory.sql
var search_directory string

type DirectoryHandler struct {
	db *sqlx.DB
}

func NewDirectoryHandler(db *sqlx.DB) *DirectoryHandler {
	return &DirectoryHandler{db: db}
}

func (h *DirectoryHandler) GetMatchingSchools(ctx context.Context, req *directoryv1.GetMatchingSchoolsRequest) (*directoryv1.GetMatchingSchoolsResponse, error) {
	var results []*directoryv1.SchoolSearch
	err := h.db.SelectContext(ctx, &results, search_directory, req.SearchTerm)
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
