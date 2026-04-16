package model

// CareerApplication represents a single job application from the tracker.
type CareerApplication struct {
	Number       int
	Date         string
	Company      string
	Role         string
	Status       string
	Score        float64
	ScoreRaw     string
	HasPDF       bool
	ReportPath   string
	ReportNumber string
	Notes          string
	InterviewSlot  string // e.g. "04/16/2026, 9:15AM - 10:00AM ET" (America/New_York)
	InterviewNotes string // Who you're meeting with this round (optional)
	Likelihood     string // e.g. "45%" or "—"
	JobURL         string // URL of the original job posting
	// Enrichment (lazy loaded from report)
	Archetype    string
	TlDr         string
	Remote       string
	CompEstimate string
}

// PipelineMetrics holds aggregate stats for the pipeline dashboard.
type PipelineMetrics struct {
	Total      int
	ByStatus   map[string]int
	AvgScore   float64
	TopScore   float64
	WithPDF    int
	Actionable int
}
