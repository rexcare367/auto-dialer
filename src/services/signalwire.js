import { RestClient } from "@signalwire/compatibility-api";
import "dotenv/config";

export const client = new RestClient(
  process.env.SIGNALWIRE_PROJECT_ID,
  process.env.SIGNALWIRE_API_TOKEN,
  { signalwireSpaceUrl: process.env.SIGNALWIRE_SPACE_URL },
);

/** Malaysia E.164 must not include the national trunk 0 after +60 (e.g. +6004… → +604…). */
function normalizeToNumber(toNumber) {
  if (typeof toNumber !== "string" || !/^\+600\d/.test(toNumber)) return toNumber;
  return `+60${toNumber.slice(4)}`;
}

export async function makeCall(toNumber) {
  const to = normalizeToNumber(toNumber);
  if (to !== toNumber) {
    console.log(`[SIGNALWIRE] Normalized ${toNumber} → ${to}`);
  }
  return client.calls.create({
    to,
    from: process.env.CALLER_NUMBER,
    url: `${process.env.WEBHOOK_BASE_URL}/webhook/twiml`,
    statusCallback: process.env.WEBHOOK_URL, // your Supabase edge function
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["ringing", "answered", "completed"],
    timeout: 15,
  });
}
