// Priority management engine.
//
// Priority levels: Critical > High > Medium > Low
//
// Inputs:
//   - Selected urgency (from the reporter)
//   - Detected category (Accident → auto Critical)
//   - Current handler availability
//
// Deterministic override rules:
//   - Any Accident report is automatically Critical regardless of urgency.
//   - Urgency maps directly to priority for other categories:
//       urgent   → High
//       moderate → Medium
//       low      → Low
//   - If no handlers are available system-wide, bump priority one level up
//     (Critical stays Critical) to signal escalation.
//
// Tie-break for equal priority: earliest submitted_at, then report_id ascending.

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export const PRIORITY_RANK: Record<Priority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export const URGENCY_TO_PRIORITY: Record<string, Priority> = {
  urgent: 'High',
  moderate: 'Medium',
  low: 'Low',
};

export function computePriority(
  urgency: string,
  category: string | null,
  anyHandlerAvailable: boolean
): { priority: Priority; reason: string } {
  // Override rule 1: Accident → Critical
  if (category === 'Accident') {
    return {
      priority: 'Critical',
      reason:
        'Accident reports automatically receive Critical priority per emergency dispatch rule.',
    };
  }

  let priority: Priority = URGENCY_TO_PRIORITY[urgency.toLowerCase()] ?? 'Medium';

  // Override rule 2: no handlers available → escalate one level
  if (!anyHandlerAvailable && priority !== 'Critical') {
    const order: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
    const idx = order.indexOf(priority);
    priority = order[Math.min(idx + 1, 3)];
    return {
      priority,
      reason: `No handlers currently available — priority escalated to ${priority} for faster dispatch when capacity returns.`,
    };
  }

  return {
    priority,
    reason: `Priority set from reporter urgency ("${urgency}").`,
  };
}

// Deterministic queue ordering for equal-priority reports:
// higher priority first, then earliest submitted_at, then report_id ascending.
export function sortQueue<
  T extends { priority: string; submitted_at: string; report_id: string }
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pr = PRIORITY_RANK[b.priority as Priority] - PRIORITY_RANK[a.priority as Priority];
    if (pr !== 0) return pr;
    const tr = a.submitted_at.localeCompare(b.submitted_at);
    if (tr !== 0) return tr;
    return a.report_id.localeCompare(b.report_id);
  });
}
