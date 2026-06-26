const DATA_ID = "main";
const EMPTY_DATA = { students: [], packages: [], lessons: [], attendance: [] };

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
  };
}

function validateData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid data");
  }

  for (const key of ["students", "packages", "lessons", "attendance"]) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Invalid ${key}`);
    }
  }
}

async function loadData() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/dodam_data?id=eq.${DATA_ID}&select=data`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase load failed: ${response.status}`);
  }

  const rows = await response.json();
  return rows[0]?.data || EMPTY_DATA;
}

async function saveData(data) {
  validateData(data);
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/dodam_data`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: DATA_ID,
      data,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase save failed: ${response.status}`);
  }
}

module.exports = {
  EMPTY_DATA,
  loadData,
  saveData,
  validateData,
};
