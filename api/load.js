const { EMPTY_DATA, loadData } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const data = await loadData();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(200).json(EMPTY_DATA);
  }
};
