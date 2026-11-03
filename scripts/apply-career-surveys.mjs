/**
 * Ensure career survey storage exists, then seed dashboard surveys.
 *
 *   node --env-file=.env.local scripts/apply-career-surveys.mjs
 */
import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const table = await sb.from("career_surveys").select("student_id").limit(1)
  if (!table.error) {
    console.log("career_surveys table is live")
  } else {
    console.log("career_surveys table missing; using private Storage bucket")
    const buckets = await sb.storage.listBuckets()
    if (!(buckets.data || []).some((bucket) => bucket.name === "career-surveys")) {
      const created = await sb.storage.createBucket("career-surveys", { public: false, fileSizeLimit: 50000 })
      if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
        throw new Error(created.error.message)
      }
      console.log("created career-surveys bucket")
    } else {
      console.log("career-surveys bucket ready")
    }
  }

  const seed = spawnSync(process.execPath, ["--env-file=.env.local", "scripts/seed-iobm-dashboard-data.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  })
  if (seed.status) process.exit(seed.status)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
