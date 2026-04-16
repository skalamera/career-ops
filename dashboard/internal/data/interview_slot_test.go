package data

import (
	"testing"
	"time"
)

func TestParseInterviewSlotEndET_Range(t *testing.T) {
	end, ok := ParseInterviewSlotEndET("04/13/2026, 2:30PM - 3:00PM ET")
	if !ok {
		t.Fatal("expected parse ok")
	}
	loc, _ := time.LoadLocation("America/New_York")
	want := time.Date(2026, time.April, 13, 15, 0, 0, 0, loc)
	if !end.Equal(want) {
		t.Errorf("got %v want %v", end, want)
	}
}

func TestInterviewPastOrUpcoming(t *testing.T) {
	loc, _ := time.LoadLocation("America/New_York")
	// After end of 04/13/2026 3pm ET
	after := time.Date(2026, time.April, 13, 16, 0, 0, 0, loc)
	if g := InterviewPastOrUpcoming("04/13/2026, 2:30PM - 3:00PM ET", after); g != "Past" {
		t.Errorf("got %q want Past", g)
	}
	before := time.Date(2026, time.April, 13, 14, 0, 0, 0, loc)
	if g := InterviewPastOrUpcoming("04/13/2026, 2:30PM - 3:00PM ET", before); g != "Upcoming" {
		t.Errorf("got %q want Upcoming", g)
	}
}
