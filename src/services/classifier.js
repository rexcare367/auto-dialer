export const STATUS_VERDICT = {
  ringing: "IN_SERVICE",
  "in-progress": "IN_SERVICE",
  completed: "IN_SERVICE",
  busy: "LIKELY_ACTIVE",
  "no-answer": "AMBIGUOUS",
};

export const ERROR_VERDICT = {
  30003: "OUT_OF_SERVICE",
  30004: "OUT_OF_SERVICE",
  30005: "OUT_OF_SERVICE",
  30006: "OUT_OF_SERVICE",
  21210: "INVALID",
};

export function classify(callStatus, errorCode) {
  let verdict = STATUS_VERDICT[callStatus] ?? null;
  if (!verdict && callStatus === "failed") {
    verdict = ERROR_VERDICT[parseInt(errorCode)] ?? "UNKNOWN";
  }
  return verdict;
}

export const TERMINAL_STATUSES = [
  "ringing",
  "completed",
  "busy",
  "no-answer",
  "failed",
];
