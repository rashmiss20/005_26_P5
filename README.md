# City Bus Breakdown Tracker

A complete, professional web application for reporting city bus breakdowns, automatically classifying faults, routing the nearest available recovery depot, assigning handlers, and tracking the entire resolution process from submission to resolution.

Built for the P5 hackathon problem statement.

---

## Features

- **Role-based authentication** — Reporter, Recovery Handler, and Administrator accounts with protected dashboards and bcrypt-hashed passwords.
- **Report submission with live validation** — DFA-based and regex-based validation of the `BUS[4-digit]-ROUTE[letters][2-digit]` identifier structure, with real-time feedback before submission.
- **Automatic breakdown classification** — Five categories (Mechanical, Tyre, Accident, Fuel, Electrical) using configurable keyword matching with a deterministic tie-break rule. Unclassifiable reports are flagged for manual review.
- **Priority management** — Critical, High, Medium, Low with override rules (Accident → Critical, no handlers → escalate) and deterministic queue ordering.
- **Routing & dispatch engine** — Static distance-lookup table indexed by route prefix, nearest-depot selection with capacity and handler-availability checks, backup depot fallback, waiting queue, and central fallback for unknown zones.
- **Five dashboards:**
  1. User Dashboard — report stats, searchable table, full report detail modal with status & routing history.
  2. Handler Dashboard — assigned reports, accept/start/resolve workflow, availability toggle, vehicle capacity editor.
  3. Routing Control Room — depot capacity bars, pending dispatch queue, waiting/fallback queue, routing decision history, distance lookup table.
  4. Analytics Dashboard — bar/pie/line charts (Recharts) for category, zone, status, monthly trends, depot workload, and handler performance — all driven by live database data.
  5. Test Suite — 22 documented test cases plus a full end-to-end integration workflow runner.
- **Persistent database** — All data survives page refresh and browser restart via IndexedDB-backed storage.
- **Exceptional scenario handling** — Unknown zones, malformed identifiers, unknown breakdown codes, handler unavailability, depot overflow, all-depts-unavailable, critical priority dispatch, duplicate assignment prevention, database failure errors.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, React Router, Recharts, Lucide React |
| Backend logic | TypeScript modules (validation, classification, routing, priority, API service layer) |
| Database | PGlite (WASM Postgres persisted to IndexedDB) — provides SQLite-equivalent persistent storage in the browser |
| Password hashing | bcryptjs |

### Why not a separate Flask server?

The problem statement specifies Flask + SQLite. This application runs entirely in the browser (Bolt environment), so a Python Flask server cannot be hosted here. Instead, the **complete backend logic** — every REST endpoint's behavior, DFA/regex validation, classification, routing/dispatch algorithm, priority rules, authentication, and database operations — is implemented as a TypeScript service layer that mirrors the Flask API exactly. The database uses PGlite (a WASM Postgres that persists to IndexedDB), which provides the same persistent, queryable storage as SQLite. All 7 required tables, relationships, and timestamps are present.

The API functions in `src/lib/api.ts` correspond 1:1 to the specified Flask endpoints:

| Flask Endpoint | TypeScript Function |
|---|---|
| `POST /api/login` | `login()` |
| `POST /api/reports` | `createReport()` |
| `GET /api/reports` | `listReports()` |
| `GET /api/reports/[id]` | `getReport()` |
| `PUT /api/reports/[id]/status` | `updateReportStatus()` |
| `POST /api/validate` | `validateEndpoint()` |
| `POST /api/classify` | `classifyEndpoint()` |
| `POST /api/dispatch` | `dispatchReport()` |
| `GET /api/routing` | `getRoutingState()` |
| `GET /api/depots` | `getDepots()` |
| `GET /api/handlers` | `listHandlers()` |
| `PUT /api/handlers/[id]/availability` | `updateHandlerAvailability()` |
| `PUT /api/handlers/[id]/capacity` | `updateHandlerCapacity()` |
| `GET /api/analytics/summary` | `analyticsSummary()` |
| `GET /api/analytics/categories` | `analyticsCategories()` |
| `GET /api/analytics/zones` | `analyticsZones()` |
| `GET /api/analytics/status` | `analyticsStatus()` |

---

## Project Structure

```
src/
├── App.tsx                    # Router + route guards
├── main.tsx                   # Entry point
├── index.css                  # Tailwind + design system
├── context/
│   └── AuthContext.tsx        # Authentication state (localStorage)
├── components/
│   ├── Layout.tsx             # Sidebar nav, header, StatCard, PageHeader
│   ├── RequireAuth.tsx        # Route guard
│   └── ui/
│       ├── Badge.tsx          # Status / Priority / Category / Zone badges
│       ├── Toast.tsx          # Toast notifications
│       └── Loading.tsx        # Spinner / loading overlay
├── lib/
│   ├── db.ts                  # Database schema (7 tables) + seed data
│   ├── types.ts               # Shared TypeScript types
│   ├── validation.ts          # DFA + regex identifier validation
│   ├── classification.ts      # Keyword-based breakdown classification
│   ├── routing.ts             # Distance lookup table + zone mapping
│   ├── priority.ts            # Priority computation + queue ordering
│   ├── api.ts                 # Service layer (all "endpoints")
│   └── tests.ts               # 22 test cases + integration test
└── pages/
    ├── Login.tsx              # Role-based login
    ├── SubmitReport.tsx       # Report submission form with live preview
    ├── UserDashboard.tsx      # User report tracking + search
    ├── HandlerDashboard.tsx   # Handler console (status updates, capacity)
    ├── RoutingDashboard.tsx   # Routing control room
    ├── Analytics.tsx          # Charts dashboard
    └── Tests.tsx              # Test suite runner
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Reporter | `user@demo.com` | `password123` |
| Recovery Handler | `handler@demo.com` | `password123` |
| Administrator | `admin@demo.com` | `password123` |

Passwords are hashed with bcrypt (10 rounds) at database seed time.

---

## Sample Data

- **5 depots**: North, South, East, West, Central — each with capacity and zone assignments (clearly marked as DEMO data).
- **8 handlers** distributed across depots with varying availability and vehicle capacity.
- **Distance lookup table**: 8 route prefixes (A–H), each mapping to ranked depots by distance. All distances are demonstration values, not real GPS data.

---

## Running Locally

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview

# Type check
npm run typecheck
```

The app runs entirely in the browser. The database initializes automatically on first load (schema creation + seed data) and persists to IndexedDB.

---

## Validation

The report identifier follows the structure:

```
BUS[4-digit]-ROUTE[alphabetic code][2-digit]
Example: BUS1234-ROUTEA12
```

Two independent validators run on every identifier:

1. **DFA** — A deterministic finite automaton with 17 states that accepts exactly `BUSdddd-ROUTEL+dd`.
2. **Regex** — `/^BUS(\d{4})$/` and `/^ROUTE([A-Z]+)(\d{2})$/`.

The application verifies both agree. If they disagree, the identifier is rejected. Errors are specific (missing separator, wrong digit count, invalid route format, etc.).

---

## Classification

Five categories with configurable keyword sets:

| Category | Example Keywords |
|---|---|
| Mechanical | engine, brake, gearbox, transmission, clutch, overheating |
| Tyre | tyre, tire, puncture, flat, blowout |
| Accident | collision, crash, accident, hit, overturned |
| Fuel | fuel, diesel, petrol, empty tank, shortage |
| Electrical | battery, electrical, wiring, alternator, fuse |

**Tie-break rule** (deterministic): Accident > Mechanical > Tyre > Fuel > Electrical.

If no keywords match, the report is flagged for **manual review** — no arbitrary category is assigned.

---

## Routing Algorithm

1. Extract the route prefix (alphabetic part) from the validated route identifier.
2. Look up the zone and ranked depot list in the distance table.
3. If the prefix is unknown → **central fallback queue**.
4. For each candidate depot (nearest first):
   - Check remaining capacity (total - currently assigned).
   - Check for an available handler with spare vehicle capacity.
   - If both pass → assign (primary if nearest, backup if a farther depot).
5. If the nearest depot is full or has no available handler → try the next nearest.
6. If no depot has capacity → **waiting queue + escalation**.
7. Critical priority reports get an additional emergency dispatch escalation note.
8. Every routing decision is recorded in `routing_history` with a timestamp.

---

## Priority Rules

| Rule | Effect |
|---|---|
| Accident report | → Critical (override) |
| Urgency "urgent" | → High |
| Urgency "moderate" | → Medium |
| Urgency "low" | → Low |
| No handlers available | Escalate one level (Low→Medium, Medium→High, High→Critical) |

**Queue ordering** for equal priority: highest priority first, then earliest `submitted_at`, then `report_id` ascending (deterministic).

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | Accounts with hashed passwords and roles |
| `reports` | Breakdown reports with category, priority, zone, depot, handler, status |
| `depots` | 5 recovery depots with capacity and zone |
| `handlers` | Recovery handlers with availability and vehicle capacity |
| `assignments` | Report-handler-depot assignments (prevents duplicates) |
| `routing_history` | Every routing decision with reason and timestamp |
| `status_history` | Every status change with old/new status, who changed it, and timestamp |
| `queue_items` | Waiting/fallback queue entries |

---

## Testing

The Test Suite page (accessible to administrators) runs:

- **22 documented test cases** covering validation, classification, routing, priority, reports, database, and analytics.
- **1 integration test** that executes the complete workflow: Report Submission → Validation → Classification → Priority → Routing → Depot Assignment → Handler Assignment → Tracking → Status Update → Resolution → Analytics.

Each test displays expected vs actual results and pass/fail status.

---

## Complete Workflow Demo

1. Log in as a Reporter (`user@demo.com` / `password123`).
2. Go to **Submit Report**.
3. Enter `BUS1234` / `ROUTEA12`, describe an "Engine failure", set urgency to "Urgent".
4. Watch the live preview show: valid identifier (DFA + regex agree), category = Mechanical, priority = High.
5. Submit — a unique report ID is generated and saved to the database.
6. Go to **My Reports** — the new report appears in the table. Click it to see full details.
7. Log in as Administrator (`admin@demo.com` / `password123`).
8. Go to **Routing Control** — the report appears in the pending dispatch queue.
9. Click **Dispatch** — the system selects the nearest depot (North) and assigns a handler.
10. Log in as Handler (`handler@demo.com` / `password123`).
11. Go to **Handler Console** — the assigned report appears.
12. Click **Start** (→ In Progress), then **Resolve** (→ Resolved).
13. Go to **Analytics** — the charts now reflect the new report and its resolution.
14. Go to **Test Suite** → **Run Integration Test** to see the full automated workflow.
