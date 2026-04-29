import { RestClient } from "@signalwire/compatibility-api";
import "dotenv/config";

export const client = new RestClient(
  process.env.SIGNALWIRE_PROJECT_ID,
  process.env.SIGNALWIRE_API_TOKEN,
  { signalwireSpaceUrl: process.env.SIGNALWIRE_SPACE_URL },
);

export async function makeCall(toNumber) {
  return client.calls.create({
    to: toNumber,
    from: process.env.CALLER_NUMBER,
    url: `${process.env.WEBHOOK_BASE_URL}/webhook/twiml`,
    statusCallback: process.env.WEBHOOK_URL, // your Supabase edge function
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["ringing", "answered", "completed"],
    timeout: 15,
  });
}
