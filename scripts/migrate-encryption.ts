/**
 * One-off: re-encrypts rows written with the legacy CryptoJS format as AES-256-GCM (v2).
 * Idempotent — already-migrated rows are skipped.
 *
 *   npm run migrate:encryption -- --dry-run   # report only
 *   npm run migrate:encryption                # rewrite
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the SAME ENCRYPTION_SECRET the data was written with.
 */
import { createClient } from '@supabase/supabase-js'
import { decryptLegacy } from '@/lib/encryption/legacy'
import { encrypt, isCurrentFormat } from '@/lib/encryption'

const TARGETS: { table: string; key: string; columns: string[] }[] = [
  { table: 'ideas', key: 'id', columns: ['content_encrypted', 'summary_encrypted'] },
  { table: 'idea_versions', key: 'id', columns: ['content_encrypted', 'summary_encrypted'] },
  { table: 'vault_meta', key: 'user_id', columns: ['index_md_encrypted', 'overview_md_encrypted'] },
  { table: 'user_settings', key: 'user_id', columns: ['llm_config_encrypted', 'embeddings_config_encrypted'] },
]
const PAGE = 500

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ENCRYPTION_SECRET']) {
    if (!process.env[name]) throw new Error(`Missing env var ${name}`)
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let migrated = 0, skipped = 0, failed = 0
  for (const { table, key, columns } of TARGETS) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select(['user_id', key, ...columns].filter((c, i, a) => a.indexOf(c) === i).join(', '))
        .order(key)
        .range(from, from + PAGE - 1)
      if (error) throw new Error(`${table}: ${error.message}`)
      if (!data || data.length === 0) break

      for (const row of data as unknown as Record<string, string>[]) {
        const update: Record<string, string> = {}
        for (const col of columns) {
          const value = row[col]
          if (!value || isCurrentFormat(value)) { skipped++; continue }
          let plain = ''
          try { plain = decryptLegacy(value, row.user_id) } catch { /* handled below */ }
          if (!plain) { console.warn(`${table}.${col} ${row[key]}: legacy decrypt failed, left untouched`); failed++; continue }
          update[col] = encrypt(plain, row.user_id)
        }
        if (Object.keys(update).length === 0) continue
        if (!dryRun) {
          const { error: updateError } = await supabase.from(table).update(update).eq(key, row[key])
          if (updateError) { console.error(`${table} ${row[key]}: ${updateError.message}`); failed++; continue }
        }
        migrated += Object.keys(update).length
      }
      if (data.length < PAGE) break
    }
    console.log(`${table}: done`)
  }
  console.log(`${dryRun ? '[dry run] would migrate' : 'migrated'} ${migrated} value(s); skipped ${skipped}; failed ${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
