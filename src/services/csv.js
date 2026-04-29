import { Parser } from "json2csv";

export function toCSV(rows) {
  const fields = [
    "id",
    "phone_number",
    "status",
    "verdict",
    "error_code",
    "call_duration",
    "note",
    "created_at",
    "dialed_at",
    "completed_at",
  ];
  const parser = new Parser({ fields });
  return parser.parse(rows);
}
