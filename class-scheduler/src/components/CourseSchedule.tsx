import { useState, useRef } from "react";

type CsvRow = {
  [key: string]: string;
};

const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
type Day = (typeof DAYS_ORDER)[number];
const DAY_MAP: Record<string, Day> = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" };

const SLOT_H = 72; // px per hour
const START_H = 7; // 7 AM
const END_H = 17;   // 4 PM

const COLORS = [
  { bg: "#EEEDFE", border: "#7F77DD", accent: "#534AB7", text: "#3C3489" },
  { bg: "#E1F5EE", border: "#1D9E75", accent: "#0F6E56", text: "#085041" },
  { bg: "#E6F1FB", border: "#378ADD", accent: "#185FA5", text: "#0C447C" },
  { bg: "#FAECE7", border: "#D85A30", accent: "#993C1D", text: "#712B13" },
  { bg: "#FAEEDA", border: "#EF9F27", accent: "#854F0B", text: "#633806" },
  { bg: "#FBEAF0", border: "#D4537E", accent: "#993556", text: "#72243E" },
];

// ── helpers ────────────────────────────────────────────────────────────────

function courseKey(c: CsvRow) {
  return `${c["Course Code"]}-${c["Section"]}-${c["Days"]}-${c["Start Time"]}`;
}

function parseDays(str: string): Day[] {
  return [...str].filter((d) => DAY_MAP[d]).map((d) => DAY_MAP[d]);
}

function parseMinutes(t: string): number {
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function roundHour(t: string): string {
  const m = parseMinutes(t);
  const h = Math.round(m / 60);
  const dh = h % 12 === 0 ? 12 : h % 12;
  const p = h >= 12 && h < 24 ? "PM" : "AM";
  return `${dh}:00 ${p}`;
}

function getPrefix(code: string | undefined): string {
  if (!code) return "";
  return code.trim().match(/^[A-Za-z]+/)?.[0] ?? code.trim();
}

function overlap(a: CsvRow, b: CsvRow): boolean {
  const aDays = parseDays(a["Days"]);
  const bDays = parseDays(b["Days"]);
  if (!aDays.some((d) => bDays.includes(d))) return false;
  const as = parseMinutes(a["Start Time"]), ae = parseMinutes(a["End Time"]);
  const bs = parseMinutes(b["Start Time"]), be = parseMinutes(b["End Time"]);
  return as < be && bs < ae;
}

function formatHour(h: number): string {
  if (h === 12) return "12 PM";
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

// ── sub-components ─────────────────────────────────────────────────────────

interface ToastProps {
  msg: string;
  type: "success" | "error";
}

function Toast({ msg, type }: ToastProps) {
  const isSuccess = type === "success";
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        borderRadius: 8,
        fontSize: 12,
        maxWidth: 340,
        background: isSuccess ? "#EAF3DE" : "#FCEBEB",
        color: isSuccess ? "#3B6D11" : "#A32D2D",
        border: `0.5px solid ${isSuccess ? "#639922" : "#E24B4A"}`,
      }}
    >
      {msg}
    </div>
  );
}

interface CourseCardProps {
  course: CsvRow;
  isAdded: boolean;
  color: (typeof COLORS)[number] | null;
  onAdd: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function CourseCard({ course, isAdded, color, onAdd, onRemove, onDragStart, onDragEnd }: CourseCardProps) {
  return (
    <div
      draggable={!isAdded}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      style={{
        background: isAdded && color ? color.bg : "#fff",
        border: `0.5px solid ${isAdded && color ? color.border : "#e2e2e2"}`,
        borderRadius: 8,
        padding: "9px 11px",
        marginBottom: 7,
        cursor: isAdded ? "default" : "grab",
        userSelect: "none",
        transition: "border-color 0.1s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: isAdded && color ? color.accent : "#666",
          }}
        >
          {course["Course Code"]} · §{course["Section"]}
        </span>
        <span style={{ fontSize: 10, color: "#999" }}>{course["Credits"]} cr</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{course["Title"]}</div>
      <div style={{ fontSize: 11, color: "#67 6", marginBottom: 5 }}>{course["Professor"]}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#999" }}>
          {course["Days"]} · {course["Start Time"]} – {course["End Time"]}
        </span>
        {isAdded ? (
          <button
            onClick={onRemove}
            style={{ fontSize: 11, color: "#A32D2D", background: "none", border: "none", cursor: "pointer" }}
          >
            Remove
          </button>
        ) : (
          <button
            onClick={onAdd}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              border: "0.5px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Add ↗
          </button>
        )}
      </div>
    </div>
  );
}

interface ScheduleBlockProps {
  course: CsvRow;
  color: (typeof COLORS)[number];
  onRemove: () => void;
}

function ScheduleBlock({ course, color, onRemove }: ScheduleBlockProps) {
  const startMins = parseMinutes(course["Start Time"]);
  const endMins = parseMinutes(course["End Time"]);
  const top = ((startMins - START_H * 60) / 60) * SLOT_H;
  const height = ((endMins - startMins) / 60) * SLOT_H;

  return (
    <div
      style={{
        position: "absolute",
        top: top + 1,
        left: 3,
        right: 3,
        height: height - 2,
        background: color.bg,
        borderLeft: `3px solid ${color.accent}`,
        borderRadius: "0 4px 4px 0",
        padding: "3px 5px",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: color.text, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
          {course["Course Code"]} §{course["Section"]}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove from schedule"
          style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "0 1px", lineHeight: 1, fontSize: 12, color: color.accent, opacity: 0.7 }}
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 9, color: color.text, opacity: 0.85, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {course["Title"]}
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function CourseScheduler({ courses }: { courses: CsvRow[] }) {
  const [filters, setFilters] = useState({ prefix: "", credits: "", professor: "", days: "", time: "" });
  const [scheduled, setScheduled] = useState<CsvRow[]>([]);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const draggedRef = useRef<CsvRow | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // Drop rows that can't be placed on a weekly grid (online, internships, etc.)
  // and deduplicate rows that share the same course/section/days/time
  const schedulable = (() => {
    const seen = new Set<string>();
    return courses.filter((c) => {
      const days = (c["Days"] ?? "").trim();
      const start = (c["Start Time"] ?? "").trim();
      if (!days || !start || start === "12:00 AM") return false;
      const key = courseKey(c);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Returns rows that pass all filters except the one named in `exclude`,
  // so each dropdown only shows options valid given the other active filters.
  const applyFilters = (rows: CsvRow[], exclude?: keyof typeof filters) => {
    return rows.filter((c) => {
      if (exclude !== "prefix" && filters.prefix && getPrefix(c["Course Code"]) !== filters.prefix) return false;
      if (exclude !== "credits" && filters.credits && (c["Credits"] ?? "").trim() !== filters.credits) return false;
      if (exclude !== "professor" && filters.professor && (c["Professor"] ?? "").trim() !== filters.professor) return false;
      if (exclude !== "days" && filters.days && (c["Days"] ?? "").trim() !== filters.days) return false;
      if (exclude !== "time" && filters.time && roundHour(c["Start Time"].trim()) !== filters.time) return false;
      return true;
    });
  };

  // Each dropdown's options are derived from courses passing all OTHER active filters
  const prefixes = [...new Set(applyFilters(schedulable, "prefix").map((c) => getPrefix(c["Course Code"])))].filter(Boolean).sort();
  const creditOpts = [...new Set(applyFilters(schedulable, "credits").map((c) => (c["Credits"] ?? "").trim()))].filter(Boolean).sort();
  const profOpts = [...new Set(applyFilters(schedulable, "professor").map((c) => (c["Professor"] ?? "").trim()))].filter(Boolean).sort();
  const daysOpts = [...new Set(applyFilters(schedulable, "days").map((c) => (c["Days"] ?? "").trim()))].filter(Boolean).sort();
  const timeOpts = [...new Set(applyFilters(schedulable, "time").map((c) => roundHour(c["Start Time"].trim())))].sort(
    (a, b) => parseMinutes(a) - parseMinutes(b)
  );

  const filtered = applyFilters(schedulable);

  const colorMap = Object.fromEntries(scheduled.map((c, i) => [courseKey(c), COLORS[i % COLORS.length]]));

  const CREDIT_CAP = 18;
  const totalCredits = scheduled.reduce((s, c) => s + parseInt(c["Credits"] ?? "0"), 0);

  const addCourse = (course: CsvRow) => {
    const key = courseKey(course);
    if (scheduled.find((c) => courseKey(c) === key)) {
      showToast("This course is already on your schedule.", "error");
      return;
    }
    const incomingCredits = parseInt(course["Credits"] ?? "0");
    if (totalCredits + incomingCredits > CREDIT_CAP) {
      showToast(`Credit limit reached — adding this course would exceed the ${CREDIT_CAP}-credit maximum (currently at ${totalCredits}).`, "error");
      return;
    }
    const conflict = scheduled.find((c) => overlap(c, course));
    if (conflict) {
      showToast(
        `Conflict with ${conflict["Course Code"]} §${conflict["Section"]} — ${conflict["Days"]} ${conflict["Start Time"]}–${conflict["End Time"]}`,
        "error"
      );
      return;
    }
    setScheduled((prev) => [...prev, course]);
    showToast(`${course["Course Code"]} §${course["Section"]} added to your schedule.`, "success");
  };

  const removeCourse = (course: CsvRow) => {
    setScheduled((prev) => prev.filter((c) => courseKey(c) !== courseKey(course)));
  };

  const clearFilters = () =>
    setFilters({ prefix: "", credits: "", professor: "", days: "", time: "" });

  const anyFilter = Object.values(filters).some(Boolean);

  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const gridH = (END_H - START_H) * SLOT_H;

  const selectStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 12,
    padding: "5px 8px",
    borderRadius: 6,
    border: "0.5px solid #ddd",
    marginBottom: 5,
    background: "#fff",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, sans-serif", background: "#f5f5f3" }}>
      {/* header */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid #e2e2e2", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Course Scheduler</h1>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "#777" }}>Fall 2026 · Drag courses to your schedule or click Add</p>
        </div>
        {scheduled.length > 0 && (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "right", fontSize: 12, color: "#555" }}>
              <strong style={{ display: "block", fontSize: 16, fontWeight: 500, color: "#111" }}>{scheduled.length}</strong>
              courses
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#555" }}>
              <strong style={{ display: "block", fontSize: 16, fontWeight: 500, color: totalCredits >= CREDIT_CAP ? "#A32D2D" : totalCredits >= CREDIT_CAP - 3 ? "#854F0B" : "#111" }}>
                {totalCredits} / {CREDIT_CAP}
              </strong>
              credits
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* left panel */}
        <div style={{ width: 280, flexShrink: 0, background: "#fff", borderRight: "0.5px solid #e2e2e2", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* filters */}
          <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #e2e2e2" }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", fontWeight: 500 }}>
              Filter courses
            </p>
            <select style={selectStyle} value={filters.prefix} onChange={(e) => setFilters((f) => ({ ...f, prefix: e.target.value }))}>
              <option value="">All departments</option>
              {prefixes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select style={selectStyle} value={filters.credits} onChange={(e) => setFilters((f) => ({ ...f, credits: e.target.value }))}>
              <option value="">All credits</option>
              {creditOpts.map((c) => <option key={c} value={c}>{c} credits</option>)}
            </select>
            <select style={selectStyle} value={filters.professor} onChange={(e) => setFilters((f) => ({ ...f, professor: e.target.value }))}>
              <option value="">All professors</option>
              {profOpts.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select style={selectStyle} value={filters.days} onChange={(e) => setFilters((f) => ({ ...f, days: e.target.value }))}>
              <option value="">All days</option>
              {daysOpts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select style={selectStyle} value={filters.time} onChange={(e) => setFilters((f) => ({ ...f, time: e.target.value }))}>
              <option value="">All times</option>
              {timeOpts.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {anyFilter && (
              <button onClick={clearFilters} style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", color: "#555", textDecoration: "underline", padding: "2px 0" }}>
                Clear all filters
              </button>
            )}
          </div>

          {/* course list */}
          <div style={{ padding: "8px 12px 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", fontWeight: 500 }}>
            {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 12px" }}>
            {filtered.length === 0 ? (
              <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 24 }}>No courses match your filters.</p>
            ) : (
              filtered.map((course) => {
                const key = courseKey(course);
                const isAdded = !!scheduled.find((c) => courseKey(c) === key);
                return (
                  <CourseCard
                    key={key}
                    course={course}
                    isAdded={isAdded}
                    color={colorMap[key] ?? null}
                    onAdd={() => addCourse(course)}
                    onRemove={() => removeCourse(course)}
                    onDragStart={() => { draggedRef.current = course; }}
                    onDragEnd={() => { draggedRef.current = null; }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* schedule */}
        <div
          style={{ flex: 1, overflow: "auto", padding: 16 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) setDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (draggedRef.current) { addCourse(draggedRef.current); draggedRef.current = null; }
          }}
        >
          <div
            style={{
              background: "#fff",
              border: `0.5px solid ${dragOver ? "#378ADD" : "#e2e2e2"}`,
              borderRadius: 12,
              overflow: "hidden",
              minWidth: 460,
              transition: "border-color 0.15s",
            }}
          >
            {/* day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(5, 1fr)", borderBottom: "0.5px solid #e2e2e2" }}>
              <div />
              {DAYS_ORDER.map((day) => (
                <div key={day} style={{ padding: "8px 6px", textAlign: "center", fontSize: 12, fontWeight: 500, color: "#666", borderLeft: "0.5px solid #e2e2e2" }}>
                  {day}
                </div>
              ))}
            </div>

            {/* grid body */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(5, 1fr)", height: gridH, position: "relative" }}>
              {/* time labels */}
              <div style={{ position: "relative" }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ position: "absolute", top: (h - START_H) * SLOT_H, right: 6, fontSize: 9, color: "#aaa", lineHeight: 1, borderTop: "0.5px solid #eee", width: "100%", paddingTop: 2, paddingRight: 6, textAlign: "right" }}
                  >
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              {/* day columns */}
              {DAYS_ORDER.map((day) => (
                <div key={day} style={{ position: "relative", borderLeft: "0.5px solid #e2e2e2" }}>
                  {hours.map((h) => (
                    <div key={h} style={{ position: "absolute", top: (h - START_H) * SLOT_H, left: 0, right: 0, borderTop: "0.5px solid #eee" }} />
                  ))}
                  {scheduled
                    .filter((c) => parseDays(c["Days"]).includes(day))
                    .map((course) => (
                      <ScheduleBlock
                        key={courseKey(course)}
                        course={course}
                        color={colorMap[courseKey(course)]}
                        onRemove={() => removeCourse(course)}
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>

          {scheduled.length === 0 && (
            <p style={{ textAlign: "center", color: "#aaa", fontSize: 13, marginTop: 32 }}>
              Drag a course here or click Add to build your schedule
            </p>
          )}
        </div>
      </div>

      {toast && <Toast {...toast} />}
    </div>
  );
}