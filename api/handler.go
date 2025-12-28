package main

import (
	"context"
	_ "embed"

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

	return &membershipv1.GetMembershipResponse{
		ByYear: results,
	}, nil
}

func (h *MembershipHandler) GetMembershipSummary(ctx context.Context, req *membershipv1.GetMembershipSummaryRequest) (*membershipv1.GetMembershipSummaryResponse, error) {
	var results membershipv1.TotalEnrollment
	err := h.db.GetContext(ctx, &results, enrollmentSummaryQuery, req.Ncessch, req.SchoolYear)
	if err != nil {
		return nil, err
	}

	return &membershipv1.GetMembershipSummaryResponse{
		Summary: &results,
	}, nil
}
