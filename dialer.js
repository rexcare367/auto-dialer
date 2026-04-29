import { supabase } from "./src/db.js";
import { makeCall } from "./src/services/signalwire.js";

const state = {
  running: false,
  currentNumber: null,
  totalDialed: 0,
  startedAt: null,
};

export function getDialerState() {
  return { ...state };
}

export function stopDialer() {
  state.running = false;
}

export async function startDialer() {
  if (state.running) return;
  state.running = true;
  state.startedAt = new Date().toISOString();
  console.log("[DIALER] Started");
  loop();
}

async function unstickPending() {
  await supabase
    .from("phone_numbers")
    .update({ status: "not_started", call_sid: null })
    .eq("status", "pending")
    .lt("dialed_at", new Date(Date.now() - 60_000).toISOString());
}

async function hasPending() {
  const { count } = await supabase
    .from("phone_numbers")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count > 0;
}

async function fetchNext() {
  // Supabase doesn't support FOR UPDATE, so we use a small window + update
  const { data } = await supabase
    .from("phone_numbers")
    .select("id, phone_number")
    .eq("status", "not_started")
    .order("id")
    .limit(1)
    .single();

  if (!data) return null;

  // Mark as pending immediately to prevent re-fetch
  const { error } = await supabase
    .from("phone_numbers")
    .update({ status: "pending", dialed_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("status", "not_started"); // guard against race condition

  return error ? null : data;
}

async function loop() {
  while (state.running) {
    // Unstick any call stuck in pending > 60s
    await unstickPending();

    // If something is pending, wait for webhook to finish it
    if (await hasPending()) {
      console.log("[DIALER] Waiting for pending call...");
      await sleep(2000);
      continue;
    }

    const record = await fetchNext();

    if (!record) {
      console.log("[DIALER] No more numbers. Done!");
      state.running = false;
      break;
    }

    state.currentNumber = record.phone_number;

    try {
      const call = await makeCall(record.phone_number);

      await supabase
        .from("phone_numbers")
        .update({ call_sid: call.sid })
        .eq("id", record.id);

      state.totalDialed++;
      console.log(`[DIALER] ${record.phone_number} → ${call.sid}`);
    } catch (err) {
      await supabase
        .from("phone_numbers")
        .update({
          status: "done",
          verdict: "INVALID",
          completed_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      console.error(`[DIALER ERROR] ${record.phone_number}: ${err.message}`);
    }

    await sleep(500);
  }

  state.running = false;
  state.currentNumber = null;
  console.log("[DIALER] Stopped");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
