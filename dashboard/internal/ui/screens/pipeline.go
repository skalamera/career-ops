package screens

import (
	"fmt"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/reflow/wordwrap"

	"github.com/santifer/career-ops/dashboard/internal/data"
	"github.com/santifer/career-ops/dashboard/internal/model"
	"github.com/santifer/career-ops/dashboard/internal/theme"
)

// PipelineClosedMsg is emitted when the pipeline screen is dismissed.
type PipelineClosedMsg struct{}

// PipelineOpenReportMsg is emitted when a report should be opened in FileViewer.
type PipelineOpenReportMsg struct {
	Path   string
	Title  string
	JobURL string
}

// PipelineOpenURLMsg is emitted when a job URL should be opened in browser.
type PipelineOpenURLMsg struct {
	URL string
}

// PipelineLoadReportMsg requests lazy loading of a report summary.
type PipelineLoadReportMsg struct {
	CareerOpsPath string
	ReportPath    string
}

// PipelineUpdateStatusMsg requests a status update for an application.
type PipelineUpdateStatusMsg struct {
	CareerOpsPath string
	App           model.CareerApplication
	NewStatus     string
}

type reportSummary struct {
	archetype string
	tldr      string
	remote    string
	comp      string
}

// Sort modes
const (
	sortScore   = "score"
	sortDate    = "date"
	sortCompany = "company"
	sortStatus  = "status"
)

// Filter modes
const (
	filterAll       = "all"
	filterEvaluated = "evaluated"
	filterApplied   = "applied"
	filterRounds = "rounds"
	filterSkip   = "skip"
	filterTop       = "top"
)

type pipelineTab struct {
	filter string
	label  string
}

var pipelineTabs = []pipelineTab{
	{filterAll, "ALL"},
	{filterEvaluated, "EVALUATED"},
	{filterApplied, "APPLIED"},
	{filterRounds, "ROUNDS"},
	{filterTop, "TOP \u22654"},
	{filterSkip, "SKIP"},
}

var sortCycle = []string{sortScore, sortDate, sortCompany, sortStatus}

var statusOptions = []string{
	"Evaluated", "Applied",
	"Round 1", "Round 2", "Round 3", "Round 4", "Round 5",
	"Offer", "Rejected", "Discarded", "SKIP",
}

// statusGroupOrder defines display order for grouped view.
var statusGroupOrder = []string{
	"offer", "round_5", "round_4", "round_3", "round_2", "round_1",
	"applied", "evaluated", "skip", "rejected", "discarded",
}

// PipelineModel implements the career pipeline dashboard screen.
type PipelineModel struct {
	apps          []model.CareerApplication
	filtered      []model.CareerApplication
	metrics       model.PipelineMetrics
	cursor        int
	scrollOffset  int
	sortMode      string
	activeTab     int
	viewMode      string // "grouped" or "flat"
	width, height int
	theme         theme.Theme
	careerOpsPath string
	reportCache   map[string]reportSummary
	// Status picker sub-state
	statusPicker bool
	statusCursor int
}

// NewPipelineModel creates a new pipeline screen.
func NewPipelineModel(t theme.Theme, apps []model.CareerApplication, metrics model.PipelineMetrics, careerOpsPath string, width, height int) PipelineModel {
	m := PipelineModel{
		apps:          apps,
		metrics:       metrics,
		sortMode:      sortScore,
		activeTab:     0,
		viewMode:      "grouped",
		width:         width,
		height:        height,
		theme:         t,
		careerOpsPath: careerOpsPath,
		reportCache:   make(map[string]reportSummary),
	}
	m.applyFilterAndSort()
	return m
}

// Init implements tea.Model.
func (m PipelineModel) Init() tea.Cmd {
	return nil
}

// Resize updates dimensions.
func (m *PipelineModel) Resize(width, height int) {
	m.width = width
	m.height = height
}

// Width returns the current width.
func (m PipelineModel) Width() int { return m.width }

// Height returns the current height.
func (m PipelineModel) Height() int { return m.height }

// CopyReportCache copies the report cache from another pipeline model.
func (m *PipelineModel) CopyReportCache(other *PipelineModel) {
	for k, v := range other.reportCache {
		m.reportCache[k] = v
	}
}

// EnrichReport caches report summary data for preview.
func (m *PipelineModel) EnrichReport(reportPath, archetype, tldr, remote, comp string) {
	m.reportCache[reportPath] = reportSummary{
		archetype: archetype,
		tldr:      tldr,
		remote:    remote,
		comp:      comp,
	}
}

// CurrentApp returns the currently selected application, if any.
func (m PipelineModel) CurrentApp() (model.CareerApplication, bool) {
	if m.cursor < 0 || m.cursor >= len(m.filtered) {
		return model.CareerApplication{}, false
	}
	return m.filtered[m.cursor], true
}

// Update handles input for the pipeline screen.
func (m PipelineModel) Update(msg tea.Msg) (PipelineModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		if m.statusPicker {
			return m.handleStatusPicker(msg)
		}
		return m.handleKey(msg)
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	}
	return m, nil
}

func (m PipelineModel) handleKey(msg tea.KeyMsg) (PipelineModel, tea.Cmd) {
	switch msg.String() {
	case "q", "esc":
		return m, func() tea.Msg { return PipelineClosedMsg{} }

	case "down":
		if len(m.filtered) > 0 {
			m.cursor++
			if m.cursor >= len(m.filtered) {
				m.cursor = len(m.filtered) - 1
			}
			m.adjustScroll()
			return m, m.loadCurrentReport()
		}

	case "up":
		if len(m.filtered) > 0 {
			m.cursor--
			if m.cursor < 0 {
				m.cursor = 0
			}
			m.adjustScroll()
			return m, m.loadCurrentReport()
		}

	case "s":
		// Cycle sort mode
		for i, s := range sortCycle {
			if s == m.sortMode {
				m.sortMode = sortCycle[(i+1)%len(sortCycle)]
				break
			}
		}
		m.applyFilterAndSort()
		m.cursor = 0
		m.scrollOffset = 0

	case "f", "right":
		m.activeTab++
		if m.activeTab >= len(pipelineTabs) {
			m.activeTab = 0
		}
		m.applyFilterAndSort()
		m.cursor = 0
		m.scrollOffset = 0

	case "left":
		m.activeTab--
		if m.activeTab < 0 {
			m.activeTab = len(pipelineTabs) - 1
		}
		m.applyFilterAndSort()
		m.cursor = 0
		m.scrollOffset = 0

	case "v":
		if m.viewMode == "grouped" {
			m.viewMode = "flat"
		} else {
			m.viewMode = "grouped"
		}

	case "enter":
		if app, ok := m.CurrentApp(); ok && app.ReportPath != "" {
			fullPath := filepath.Join(m.careerOpsPath, app.ReportPath)
			title := fmt.Sprintf("%s \u2014 %s", app.Company, app.Role)
			jobURL := app.JobURL
			return m, func() tea.Msg {
				return PipelineOpenReportMsg{Path: fullPath, Title: title, JobURL: jobURL}
			}
		}

	case "o":
		if app, ok := m.CurrentApp(); ok && app.JobURL != "" {
			return m, func() tea.Msg {
				return PipelineOpenURLMsg{URL: app.JobURL}
			}
		}

	case "c":
		if len(m.filtered) > 0 {
			m.statusPicker = true
			m.statusCursor = 0
		}

	case "pgdown", "ctrl+d":
		m.scrollOffset += m.height / 2
		return m, nil

	case "pgup", "ctrl+u":
		m.scrollOffset -= m.height / 2
		if m.scrollOffset < 0 {
			m.scrollOffset = 0
		}
		return m, nil
	}

	return m, nil
}

func (m PipelineModel) handleStatusPicker(msg tea.KeyMsg) (PipelineModel, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.statusPicker = false
		return m, nil

	case "down":
		m.statusCursor++
		if m.statusCursor >= len(statusOptions) {
			m.statusCursor = len(statusOptions) - 1
		}

	case "up":
		m.statusCursor--
		if m.statusCursor < 0 {
			m.statusCursor = 0
		}

	case "enter":
		m.statusPicker = false
		if app, ok := m.CurrentApp(); ok {
			newStatus := statusOptions[m.statusCursor]
			return m, func() tea.Msg {
				return PipelineUpdateStatusMsg{
					CareerOpsPath: m.careerOpsPath,
					App:           app,
					NewStatus:     newStatus,
				}
			}
		}
	}
	return m, nil
}

func (m PipelineModel) loadCurrentReport() tea.Cmd {
	app, ok := m.CurrentApp()
	if !ok || app.ReportPath == "" {
		return nil
	}
	if _, cached := m.reportCache[app.ReportPath]; cached {
		return nil
	}
	path := m.careerOpsPath
	report := app.ReportPath
	return func() tea.Msg {
		return PipelineLoadReportMsg{CareerOpsPath: path, ReportPath: report}
	}
}

// applyFilterAndSort rebuilds the filtered list from apps.
func (m *PipelineModel) applyFilterAndSort() {
	var filtered []model.CareerApplication

	currentFilter := pipelineTabs[m.activeTab].filter
	for _, app := range m.apps {
		norm := data.NormalizeStatus(app.Status)
		switch currentFilter {
		case filterAll:
			filtered = append(filtered, app)
		case filterTop:
			if app.Score >= 4.0 && norm != "no_aplicar" {
				filtered = append(filtered, app)
			}
		case filterRounds:
			if isRoundStatus(norm) {
				filtered = append(filtered, app)
			}
		default:
			if norm == currentFilter {
				filtered = append(filtered, app)
			}
		}
	}

	// Sort
	switch m.sortMode {
	case sortScore:
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].Score > filtered[j].Score
		})
	case sortDate:
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].Date > filtered[j].Date
		})
	case sortCompany:
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].Company) < strings.ToLower(filtered[j].Company)
		})
	case sortStatus:
		sort.SliceStable(filtered, func(i, j int) bool {
			return data.StatusPriority(filtered[i].Status) < data.StatusPriority(filtered[j].Status)
		})
	}

	// In grouped mode, always sort by status priority first, then by selected sort within groups
	if m.viewMode == "grouped" {
		sort.SliceStable(filtered, func(i, j int) bool {
			pi := data.StatusPriority(filtered[i].Status)
			pj := data.StatusPriority(filtered[j].Status)
			if pi != pj {
				return pi < pj
			}
			// Within same group, use selected sort
			switch m.sortMode {
			case sortScore:
				return filtered[i].Score > filtered[j].Score
			case sortDate:
				return filtered[i].Date > filtered[j].Date
			case sortCompany:
				return strings.ToLower(filtered[i].Company) < strings.ToLower(filtered[j].Company)
			default:
				return filtered[i].Score > filtered[j].Score
			}
		})
	}

	m.filtered = filtered
}

// adjustScroll updates scrollOffset so the cursor stays visible.
func (m *PipelineModel) adjustScroll() {
	availHeight := m.height - 12 // header + tabs(2) + metrics + sortbar + footer + preview
	if availHeight < 5 {
		availHeight = 5
	}
	line := m.cursorLineEstimate()
	margin := 3

	if line >= m.scrollOffset+availHeight-margin {
		m.scrollOffset = line - availHeight + margin + 1
	}
	if line < m.scrollOffset+margin {
		m.scrollOffset = line - margin
	}
	if m.scrollOffset < 0 {
		m.scrollOffset = 0
	}
}

func (m PipelineModel) cursorLineEstimate() int {
	line := 0
	prevStatus := ""
	for i, app := range m.filtered {
		norm := data.NormalizeStatus(app.Status)
		if m.viewMode == "grouped" {
			if norm != prevStatus {
				line++
				prevStatus = norm
			}
		}
		if i == m.cursor {
			return line
		}
		line += len(m.pipelineAppVisualLines(app))
	}
	return line
}

// -- View --

// View renders the pipeline screen.
func (m PipelineModel) View() string {
	header := m.renderHeader()
	tabs := m.renderTabs()
	metricsBar := m.renderMetrics()
	sortBar := m.renderSortBar()
	body := m.renderBody()
	preview := m.renderPreview()
	help := m.renderHelp()

	// Apply scroll to body
	bodyLines := strings.Split(body, "\n")
	if m.scrollOffset > 0 && m.scrollOffset < len(bodyLines) {
		bodyLines = bodyLines[m.scrollOffset:]
	}

	// Calculate available height for body
	previewLines := strings.Count(preview, "\n") + 1
	availHeight := m.height - 7 - previewLines // header + tabs(2) + metrics + sortbar + help + preview
	if availHeight < 3 {
		availHeight = 3
	}
	if len(bodyLines) > availHeight {
		bodyLines = bodyLines[:availHeight]
	}
	body = strings.Join(bodyLines, "\n")

	// Status picker overlay
	if m.statusPicker {
		body = m.overlayStatusPicker(body)
	}

	return lipgloss.JoinVertical(lipgloss.Left,
		header,
		tabs,
		metricsBar,
		sortBar,
		body,
		preview,
		help,
	)
}

func (m PipelineModel) renderHeader() string {
	style := lipgloss.NewStyle().
		Bold(true).
		Foreground(m.theme.Text).
		Background(m.theme.Surface).
		Width(m.width).
		Padding(0, 2)

	right := lipgloss.NewStyle().Foreground(m.theme.Subtext)
	avg := fmt.Sprintf("%.1f", m.metrics.AvgScore)
	info := right.Render(fmt.Sprintf("%d offers | Avg %s/5", m.metrics.Total, avg))

	title := lipgloss.NewStyle().Bold(true).Foreground(m.theme.Blue).Render("CAREER PIPELINE")
	gap := m.width - lipgloss.Width(title) - lipgloss.Width(info) - 4
	if gap < 1 {
		gap = 1
	}

	return style.Render(title + strings.Repeat(" ", gap) + info)
}

func (m PipelineModel) renderTabs() string {
	var tabs []string
	var underParts []string

	for i, tab := range pipelineTabs {
		// Count items for this tab
		count := m.countForFilter(tab.filter)
		label := fmt.Sprintf(" %s (%d) ", tab.label, count)

		if i == m.activeTab {
			style := lipgloss.NewStyle().
				Bold(true).
				Foreground(m.theme.Blue).
				Padding(0, 0)
			tabs = append(tabs, style.Render(label))
			underParts = append(underParts, strings.Repeat("\u2501", lipgloss.Width(label)))
		} else {
			style := lipgloss.NewStyle().
				Foreground(m.theme.Subtext).
				Padding(0, 0)
			tabs = append(tabs, style.Render(label))
			underParts = append(underParts, strings.Repeat("\u2500", lipgloss.Width(label)))
		}
	}

	row := lipgloss.JoinHorizontal(lipgloss.Top, tabs...)
	underline := lipgloss.NewStyle().Foreground(m.theme.Overlay).Render(strings.Join(underParts, ""))

	padStyle := lipgloss.NewStyle().Padding(0, 1)
	return padStyle.Render(row) + "\n" + padStyle.Render(underline)
}

func (m PipelineModel) countForFilter(filter string) int {
	count := 0
	for _, app := range m.apps {
		norm := data.NormalizeStatus(app.Status)
		switch filter {
		case filterAll:
			count++
		case filterTop:
			if app.Score >= 4.0 && norm != "no_aplicar" {
				count++
			}
		case filterRounds:
			if isRoundStatus(norm) {
				count++
			}
		default:
			if norm == filter {
				count++
			}
		}
	}
	return count
}

func isRoundStatus(norm string) bool {
	switch norm {
	case "round_1", "round_2", "round_3", "round_4", "round_5":
		return true
	default:
		return false
	}
}

func (m PipelineModel) renderMetrics() string {
	style := lipgloss.NewStyle().
		Background(m.theme.Surface).
		Width(m.width).
		Padding(0, 2)

	var parts []string
	statusColors := m.statusColorMap()

	for _, status := range statusGroupOrder {
		count, ok := m.metrics.ByStatus[status]
		if !ok || count == 0 {
			continue
		}
		color := statusColors[status]
		s := lipgloss.NewStyle().Foreground(color)
		parts = append(parts, s.Render(fmt.Sprintf("%s:%d", statusLabel(status), count)))
	}

	return style.Render(strings.Join(parts, "  "))
}

func (m PipelineModel) renderSortBar() string {
	style := lipgloss.NewStyle().
		Foreground(m.theme.Subtext).
		Width(m.width).
		Padding(0, 2)

	sortLabel := fmt.Sprintf("[Sort: %s]", m.sortMode)
	viewLabel := fmt.Sprintf("[View: %s]", m.viewMode)
	count := fmt.Sprintf("%d shown", len(m.filtered))

	return style.Render(fmt.Sprintf("%s  %s  %s", sortLabel, viewLabel, count))
}

func (m PipelineModel) renderBody() string {
	if len(m.filtered) == 0 {
		emptyStyle := lipgloss.NewStyle().
			Foreground(m.theme.Subtext).
			Padding(1, 2)
		return emptyStyle.Render("No offers match this filter")
	}

	var lines []string
	prevStatus := ""
	padStyle := lipgloss.NewStyle().Padding(0, 2)

	for i, app := range m.filtered {
		norm := data.NormalizeStatus(app.Status)

		// Group header in grouped mode
		if m.viewMode == "grouped" && norm != prevStatus {
			count := m.countByNormStatus(norm)
			headerStyle := lipgloss.NewStyle().
				Bold(true).
				Foreground(m.theme.Subtext)
			lines = append(lines, padStyle.Render(
				headerStyle.Render(fmt.Sprintf("\u2500\u2500 %s (%d) %s",
					strings.ToUpper(statusLabel(norm)), count,
					strings.Repeat("\u2500", max(0, m.width-30-len(statusLabel(norm)))))),
			))
			prevStatus = norm
		}

		selected := i == m.cursor
		line := m.renderAppLine(app, selected)
		lines = append(lines, line)
	}

	return strings.Join(lines, "\n")
}

// pipelineColumnWidths returns fixed column widths; role width depends on terminal width.
func (m PipelineModel) pipelineColumnWidths() (scoreW, companyW, roleW, statusW, whenW, pastW, inoteW, compW, likeW int) {
	const roleMax = 40
	scoreW = 5
	companyW = 16
	statusW = 10
	whenW = 28
	pastW = 10
	inoteW = 35
	compW = 30
	likeW = 6
	fixed := scoreW + companyW + statusW + whenW + pastW + inoteW + compW + likeW + 16
	roleW = m.width - fixed
	if roleW < 8 {
		roleW = 8
	}
	if roleW > roleMax {
		roleW = roleMax
	}
	return
}

func wrapCell(s string, w int) []string {
	if w < 1 {
		w = 1
	}
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.TrimSpace(s)
	if s == "" {
		return []string{""}
	}
	wrapped := wordwrap.String(s, w)
	lines := strings.Split(wrapped, "\n")
	if len(lines) == 0 {
		return []string{""}
	}
	return lines
}

func padLineSlice(lines []string, n int) []string {
	out := make([]string, n)
	for i := 0; i < n; i++ {
		if i < len(lines) {
			out[i] = lines[i]
		} else {
			out[i] = ""
		}
	}
	return out
}

// pipelineAppVisualLines renders one application as one or more terminal lines (word-wrapped cells).
func (m PipelineModel) pipelineAppVisualLines(app model.CareerApplication) []string {
	scoreW, companyW, roleW, statusW, whenW, pastW, inoteW, compW, likeW := m.pipelineColumnWidths()

	scoreStr := strings.TrimSpace(app.ScoreRaw)
	if scoreStr == "" {
		scoreStr = fmt.Sprintf("%.1f", app.Score)
	}
	scoreLines := wrapCell(scoreStr, scoreW)
	companyLines := wrapCell(app.Company, companyW)
	roleLines := wrapCell(app.Role, roleW)

	norm := data.NormalizeStatus(app.Status)
	statusLbl := statusLabel(norm)
	statusLines := wrapCell(statusLbl, statusW)

	whenLines := wrapCell(app.InterviewSlot, whenW)

	pastLabel := data.InterviewPastOrUpcoming(app.InterviewSlot, time.Now())
	pastLines := wrapCell(pastLabel, pastW)

	inotesLines := wrapCell(app.InterviewNotes, inoteW)

	compStr := ""
	if summary, ok := m.reportCache[app.ReportPath]; ok && summary.comp != "" {
		compStr = summary.comp
	}
	compLines := wrapCell(compStr, compW)

	likeStr := strings.TrimSpace(app.Likelihood)
	if likeStr == "" {
		likeStr = "—"
	}
	likeLines := wrapCell(likeStr, likeW)

	maxH := len(scoreLines)
	for _, n := range []int{len(companyLines), len(roleLines), len(statusLines), len(whenLines), len(pastLines), len(inotesLines), len(compLines), len(likeLines)} {
		if n > maxH {
			maxH = n
		}
	}
	if maxH < 1 {
		maxH = 1
	}
	scoreLines = padLineSlice(scoreLines, maxH)
	companyLines = padLineSlice(companyLines, maxH)
	roleLines = padLineSlice(roleLines, maxH)
	statusLines = padLineSlice(statusLines, maxH)
	whenLines = padLineSlice(whenLines, maxH)
	pastLines = padLineSlice(pastLines, maxH)
	inotesLines = padLineSlice(inotesLines, maxH)
	compLines = padLineSlice(compLines, maxH)
	likeLines = padLineSlice(likeLines, maxH)

	scoreStyle := m.scoreStyle(app.Score)
	statusColor, ok := m.statusColorMap()[norm]
	if !ok {
		statusColor = m.theme.Text
	}
	statusStyle := lipgloss.NewStyle().Foreground(statusColor)
	companyStyle := lipgloss.NewStyle().Foreground(m.theme.Text)
	roleStyle := lipgloss.NewStyle().Foreground(m.theme.Subtext)
	whenStyle := lipgloss.NewStyle().Foreground(m.theme.Subtext)

	pastColor := m.theme.Subtext
	switch pastLabel {
	case "Upcoming":
		pastColor = m.theme.Yellow
	case "?":
		pastColor = m.theme.Red
	}
	pastStyle := lipgloss.NewStyle().Foreground(pastColor)
	inoteStyle := lipgloss.NewStyle().Foreground(m.theme.Text)
	compStyle := lipgloss.NewStyle().Foreground(m.theme.Yellow)

	// Likelihood color: green ≥60%, yellow 30-59%, red <30%, dim for "—"
	likeColor := m.theme.Subtext
	if lk := strings.TrimSpace(app.Likelihood); lk != "" && lk != "—" {
		if pct, err := strconv.Atoi(strings.TrimSuffix(lk, "%")); err == nil {
			switch {
			case pct >= 60:
				likeColor = m.theme.Green
			case pct >= 30:
				likeColor = m.theme.Yellow
			default:
				likeColor = m.theme.Red
			}
		}
	}
	likeStyle := lipgloss.NewStyle().Foreground(likeColor)

	out := make([]string, maxH)
	for i := 0; i < maxH; i++ {
		scoreCell := scoreStyle.Width(scoreW).Render(scoreLines[i])
		companyCell := companyStyle.Width(companyW).Render(companyLines[i])
		roleCell := roleStyle.Width(roleW).Render(roleLines[i])
		statusCell := statusStyle.Width(statusW).Render(statusLines[i])
		whenCell := whenStyle.Width(whenW).Render(whenLines[i])
		pastCell := pastStyle.Width(pastW).Render(pastLines[i])
		inoteCell := inoteStyle.Width(inoteW).Render(inotesLines[i])
		compCell := compStyle.Width(compW).Render(compLines[i])
		likeCell := likeStyle.Width(likeW).Render(likeLines[i])
		out[i] = " " + strings.Join([]string{
			scoreCell, companyCell, roleCell, statusCell, whenCell, pastCell, inoteCell, compCell, likeCell,
		}, " ")
	}
	return out
}

func (m PipelineModel) renderAppLine(app model.CareerApplication, selected bool) string {
	padStyle := lipgloss.NewStyle().Padding(0, 2)
	selStyle := lipgloss.NewStyle().
		Background(m.theme.Overlay).
		Width(m.width - 4)

	lines := m.pipelineAppVisualLines(app)
	out := make([]string, len(lines))
	for i, ln := range lines {
		if selected {
			out[i] = padStyle.Render(selStyle.Render(ln))
		} else {
			out[i] = padStyle.Render(ln)
		}
	}
	return strings.Join(out, "\n")
}

func (m PipelineModel) renderPreview() string {
	app, ok := m.CurrentApp()
	if !ok {
		return ""
	}

	padStyle := lipgloss.NewStyle().Padding(0, 2)
	divider := lipgloss.NewStyle().Foreground(m.theme.Overlay)

	var lines []string
	lines = append(lines, padStyle.Render(divider.Render(strings.Repeat("\u2500", m.width-4))))

	labelStyle := lipgloss.NewStyle().Foreground(m.theme.Sky).Bold(true)
	valueStyle := lipgloss.NewStyle().Foreground(m.theme.Text)
	dimStyle := lipgloss.NewStyle().Foreground(m.theme.Subtext)

	// Check report cache
	if summary, ok := m.reportCache[app.ReportPath]; ok {
		if summary.archetype != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render("Arquetipo: ")+valueStyle.Render(summary.archetype)))
		}
		if summary.tldr != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render("TL;DR: ")+valueStyle.Render(summary.tldr)))
		}
		if summary.comp != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render("Comp: ")+valueStyle.Render(summary.comp)))
		}
		if summary.remote != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render("Remote: ")+valueStyle.Render(summary.remote)))
		}
		if app.Notes != "" {
			notes := app.Notes
			if len(notes) > m.width-12 {
				notes = notes[:m.width-15] + "..."
			}
			lines = append(lines, padStyle.Render(
				labelStyle.Render("Notes: ")+valueStyle.Render(notes)))
		}
	} else if app.Notes != "" {
		notes := app.Notes
		if len(notes) > m.width-10 {
			notes = notes[:m.width-13] + "..."
		}
		lines = append(lines, padStyle.Render(dimStyle.Render(notes)))
	} else {
		lines = append(lines, padStyle.Render(dimStyle.Render("Loading preview...")))
	}

	if app.InterviewSlot != "" {
		lines = append(lines, padStyle.Render(
			labelStyle.Render("Interview (ET): ")+valueStyle.Render(app.InterviewSlot)))
		lines = append(lines, padStyle.Render(
			labelStyle.Render("Meeting: ")+valueStyle.Render(data.InterviewPastOrUpcoming(app.InterviewSlot, time.Now()))))
	}
	if app.InterviewNotes != "" {
		lines = append(lines, padStyle.Render(
			labelStyle.Render("Who: ")+valueStyle.Render(app.InterviewNotes)))
	}
	if lk := strings.TrimSpace(app.Likelihood); lk != "" && lk != "—" {
		likeLabel := labelStyle.Render("Likelihood: ")
		likeVal := valueStyle.Render(lk)
		if pct, err := strconv.Atoi(strings.TrimSuffix(lk, "%")); err == nil {
			switch {
			case pct >= 60:
				likeVal = lipgloss.NewStyle().Foreground(m.theme.Green).Bold(true).Render(lk)
			case pct >= 30:
				likeVal = lipgloss.NewStyle().Foreground(m.theme.Yellow).Bold(true).Render(lk)
			default:
				likeVal = lipgloss.NewStyle().Foreground(m.theme.Red).Bold(true).Render(lk)
			}
		}
		lines = append(lines, padStyle.Render(likeLabel+likeVal))
	}

	return strings.Join(lines, "\n")
}

func (m PipelineModel) renderHelp() string {
	style := lipgloss.NewStyle().
		Foreground(m.theme.Subtext).
		Background(m.theme.Surface).
		Width(m.width).
		Padding(0, 1)

	keyStyle := lipgloss.NewStyle().Bold(true).Foreground(m.theme.Text)
	descStyle := lipgloss.NewStyle().Foreground(m.theme.Subtext)

	if m.statusPicker {
		return style.Render(
			keyStyle.Render("↑↓") + descStyle.Render(" navigate  ") +
				keyStyle.Render("Enter") + descStyle.Render(" confirm  ") +
				keyStyle.Render("Esc") + descStyle.Render(" cancel"))
	}

	brand := lipgloss.NewStyle().Foreground(m.theme.Overlay).Render("career-ops by santifer.io")

	keys := keyStyle.Render("↑↓") + descStyle.Render(" nav  ") +
		keyStyle.Render("←→") + descStyle.Render(" tabs  ") +
		keyStyle.Render("s") + descStyle.Render(" sort  ") +
		keyStyle.Render("Enter") + descStyle.Render(" report  ") +
		keyStyle.Render("o") + descStyle.Render(" open URL  ") +
		keyStyle.Render("c") + descStyle.Render(" change  ") +
		keyStyle.Render("v") + descStyle.Render(" view  ") +
		keyStyle.Render("Esc") + descStyle.Render(" quit")

	gap := m.width - lipgloss.Width(keys) - lipgloss.Width(brand) - 2
	if gap < 1 {
		gap = 1
	}

	return style.Render(keys + strings.Repeat(" ", gap) + brand)
}

func (m PipelineModel) overlayStatusPicker(body string) string {
	// Render status picker inline at bottom of body
	bodyLines := strings.Split(body, "\n")

	pickerWidth := 30
	padStyle := lipgloss.NewStyle().Padding(0, 2)
	borderStyle := lipgloss.NewStyle().
		Foreground(m.theme.Blue).
		Bold(true)

	var picker []string
	picker = append(picker, padStyle.Render(borderStyle.Render("Change status:")))

	for i, opt := range statusOptions {
		style := lipgloss.NewStyle().Foreground(m.theme.Text).Width(pickerWidth)
		if i == m.statusCursor {
			style = style.Background(m.theme.Overlay).Bold(true)
		}
		prefix := "  "
		if i == m.statusCursor {
			prefix = "> "
		}
		picker = append(picker, padStyle.Render(style.Render(prefix+opt)))
	}

	// Append picker to body
	bodyLines = append(bodyLines, picker...)
	return strings.Join(bodyLines, "\n")
}

// -- Helpers --

func (m PipelineModel) scoreStyle(score float64) lipgloss.Style {
	switch {
	case score >= 4.2:
		return lipgloss.NewStyle().Foreground(m.theme.Green).Bold(true)
	case score >= 3.8:
		return lipgloss.NewStyle().Foreground(m.theme.Yellow)
	case score >= 3.0:
		return lipgloss.NewStyle().Foreground(m.theme.Text)
	default:
		return lipgloss.NewStyle().Foreground(m.theme.Red)
	}
}

func (m PipelineModel) statusColorMap() map[string]lipgloss.Color {
	return map[string]lipgloss.Color{
		"offer":    m.theme.Green,
		"round_5":  m.theme.Green,
		"round_4":  m.theme.Green,
		"round_3":  m.theme.Yellow,
		"round_2":  m.theme.Sky,
		"round_1":  m.theme.Blue,
		"applied":  m.theme.Sky,
		"evaluated": m.theme.Text,
		"skip":      m.theme.Red,
		"rejected":  m.theme.Subtext,
		"discarded": m.theme.Subtext,
	}
}

func (m PipelineModel) countByNormStatus(status string) int {
	count := 0
	for _, app := range m.filtered {
		if data.NormalizeStatus(app.Status) == status {
			count++
		}
	}
	return count
}

func statusLabel(norm string) string {
	switch norm {
	case "round_1":
		return "Round 1"
	case "round_2":
		return "Round 2"
	case "round_3":
		return "Round 3"
	case "round_4":
		return "Round 4"
	case "round_5":
		return "Round 5"
	case "offer":
		return "Offer"
	case "applied":
		return "Applied"
	case "evaluated":
		return "Evaluated"
	case "skip":
		return "Skip"
	case "rejected":
		return "Rejected"
	case "discarded":
		return "Discarded"
	default:
		return norm
	}
}
