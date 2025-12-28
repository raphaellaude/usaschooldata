package main

import (
	"context"
	"database/sql"
	_ "embed"
	"errors"

	"connectrpc.com/connect"
	"github.com/jmoiron/sqlx"
	membershipv1 "github.com/raphaellaude/usaschooldata/api/membership/v1"
)

//go:embed sql/historical_enrollment.sql
var historicalEnrollmentQuery string

//go:embed sql/enrollment_summary.sql
var enrollmentSummaryQuery string

type MembershipHandler struct {
	db *sqlx.DB
}

func NewMembershipHandler(db *sqlx.DB) *MembershipHandler {
	return &MembershipHandler{db: db}
}

func (h *MembershipHandler) GetMembership(ctx context.Context, req *membershipv1.GetMembershipRequest) (*membershipv1.GetMembershipResponse, error) {
	var results []*membershipv1.TotalEnrollment
	err := h.db.SelectContext(ctx, &results, historicalEnrollmentQuery, req.Ncessch)
	if err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, connect.NewError(
			connect.CodeNotFound,
			errors.New("no enrollment data available for this school"),
		)
	}

	return &membershipv1.GetMembershipResponse{
		Ncessch: req.Ncessch,
		ByYear:  results,
	}, nil
}

func (h *MembershipHandler) GetMembershipSummary(ctx context.Context, req *membershipv1.GetMembershipSummaryRequest) (*membershipv1.GetMembershipSummaryResponse, error) {
	var results membershipv1.TotalEnrollment
	err := h.db.GetContext(ctx, &results, enrollmentSummaryQuery, req.Ncessch, req.SchoolYear)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(
				connect.CodeNotFound,
				errors.New("no enrollment data available for this school and year"),
			)
		}
		return nil, err
	}

	return &membershipv1.GetMembershipSummaryResponse{
		Ncessch: req.Ncessch,
		Summary: &results,
	}, nil
}
