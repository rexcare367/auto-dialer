import { Router } from "express";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { supabase } from "../db.js";
import { toCSV } from "../services/csv.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── GET /api/numbers ─────────────────────────────────────────────────────────
// Filters: status, verdict, phone, page, limit
router.get("/", async (req, res) => {
  try {
    const { status, verdict, phone, page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from("phone_numbers")
      .select("*", { count: "exact" })
      .order("id", { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq("status", status);
    if (verdict) query = query.eq("verdict", verdict);
    if (phone) query = query.ilike("phone_number", `%${phone}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      data,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/numbers/stats ───────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { data, error } = await supabase.rpc("get_number_stats"); // we'll create this SQL function below

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/numbers/download ────────────────────────────────────────────────
// Downloads filtered results as CSV
router.get("/download", async (req, res) => {
  try {
    const { status, verdict } = req.query;

    let query = supabase.from("phone_numbers").select("*").order("id");

    if (status) query = query.eq("status", status);
    if (verdict) query = query.eq("verdict", verdict);

    const { data, error } = await query;
    if (error) throw error;

    const csv = toCSV(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="numbers_${Date.now()}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/numbers ────────────────────────────────────────────────────────
// Add a single phone number
router.post("/", async (req, res) => {
  try {
    const { phone_number, note } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: "phone_number is required" });
    }

    const { data, error } = await supabase
      .from("phone_numbers")
      .insert({ phone_number, note: note ?? null })
      .select()
      .single();

    if (error) {
      // Unique violation — number already exists
      if (error.code === "23505") {
        return res.status(409).json({ error: "Phone number already exists" });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/numbers/upload ─────────────────────────────────────────────────
// Bulk upload via CSV file
// CSV format: one column named "phone_number"
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'No file uploaded. Field name must be "file"' });
    }

    // Parse CSV from buffer
    const numbers = await new Promise((resolve, reject) => {
      const results = [];
      Readable.from(req.file.buffer)
        .pipe(csvParser())
        .on("data", (row) => {
          const num = row.phone?.trim();
          if (num) results.push({ phone_number: num });
        })
        .on("end", () => resolve(results))
        .on("error", reject);
    });

    if (numbers.length === 0) {
      return res
        .status(400)
        .json({ error: "CSV has no valid phone_number entries" });
    }

    // Upsert in batches of 1000 — skip duplicates
    const BATCH = 1000;
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < numbers.length; i += BATCH) {
      const batch = numbers.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("phone_numbers")
        .upsert(batch, {
          onConflict: "phone_number",
          ignoreDuplicates: true,
        })
        .select();

      if (error) throw error;
      inserted += data.length;
      skipped += batch.length - data.length;
    }

    res.json({
      message: `Upload complete`,
      total: numbers.length,
      inserted,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/numbers/:id ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("phone_numbers")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
