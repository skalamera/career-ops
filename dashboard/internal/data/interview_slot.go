package data

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	reInterviewRangeEnd = regexp.MustCompile(`(?i)(\d{1,2})/(\d{1,2})/(\d{4}),\s*\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)`)
	reInterviewSingle   = regexp.MustCompile(`(?i)(\d{1,2})/(\d{1,2})/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)(?:\s*ET)?`)
)

// ParseInterviewSlotEndET returns the end instant of an interview window in America/New_York.
// Accepts strings like "04/16/2026, 9:15AM - 10:00AM ET" or single-slot "04/13/2026, 2:30PM ET".
func ParseInterviewSlotEndET(slot string) (time.Time, bool) {
	s := strings.TrimSpace(slot)
	if s == "" {
		return time.Time{}, false
	}
	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		loc = time.UTC
	}

	if m := reInterviewRangeEnd.FindStringSubmatch(s); len(m) == 7 {
		return buildET(loc, m[1], m[2], m[3], m[4], m[5], m[6])
	}

	if m := reInterviewSingle.FindStringSubmatch(s); len(m) == 7 {
		return buildET(loc, m[1], m[2], m[3], m[4], m[5], m[6])
	}

	return time.Time{}, false
}

func buildET(loc *time.Location, mo, day, yr, hh, mm, ap string) (time.Time, bool) {
	month, err1 := strconv.Atoi(mo)
	d, err2 := strconv.Atoi(day)
	year, err3 := strconv.Atoi(yr)
	h, err4 := strconv.Atoi(hh)
	min, err5 := strconv.Atoi(mm)
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil || err5 != nil {
		return time.Time{}, false
	}
	ap = strings.ToUpper(strings.TrimSpace(ap))
	if ap == "PM" && h != 12 {
		h += 12
	}
	if ap == "AM" && h == 12 {
		h = 0
	}
	t := time.Date(year, time.Month(month), d, h, min, 0, 0, loc)
	return t, true
}

// InterviewPastOrUpcoming returns "Past", "Upcoming", or "—" / "?" when unknown.
func InterviewPastOrUpcoming(slot string, now time.Time) string {
	s := strings.TrimSpace(slot)
	if s == "" {
		return "—"
	}
	end, ok := ParseInterviewSlotEndET(s)
	if !ok {
		return "?"
	}
	loc := end.Location()
	n := now.In(loc)
	if n.After(end) {
		return "Past"
	}
	return "Upcoming"
}
