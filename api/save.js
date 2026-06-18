const { saveData, validateData } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    validateData(body);
    await saveData(body);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Save failed" });
  }
};
