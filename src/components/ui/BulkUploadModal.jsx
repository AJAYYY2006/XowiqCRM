import { useState, useRef, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, ArrowLeft, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { IMPORT_CONFIGS, BATCH_SIZE, ACCEPTED_EXTENSIONS, autoMapColumns } from '../../config/importConfigs'
import { isValidEmail, isValidPhone } from '../../lib/validation'

const PREVIEW_ROWS = 8
const SKIP = ''

/* ----------------------------- value helpers ----------------------------- */

const pad = (n) => String(n).padStart(2, '0')
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function checkDate(y, m, d) {
  y = Number(y); m = Number(m); d = Number(d)
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return { error: 'Invalid date' }
  const probe = new Date(y, m - 1, d)
  if (probe.getMonth() !== m - 1 || probe.getDate() !== d) return { error: 'Invalid date' }
  return { value: `${y}-${pad(m)}-${pad(d)}` }
}

function parseDate(raw) {
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return { error: 'Invalid date' }
    return { value: toISODate(raw) }
  }
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw)
    if (!d) return { error: 'Invalid date' }
    return checkDate(d.y, d.m, d.d)
  }
  const s = String(raw).trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return checkDate(m[1], m[2], m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    let a = Number(m[1]), b = Number(m[2]), y = Number(m[3])
    if (y < 100) y += 2000
    // Default to day/month/year; fall back to month/day/year when day slot can't be a month.
    let day = a, month = b
    if (a <= 12 && b > 12) { day = b; month = a }
    return checkDate(y, month, day)
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return { value: toISODate(d) }
  return { error: `Unrecognised date "${s}"` }
}

function isBlank(raw) {
  return raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')
}

/** Convert one raw cell into a DB-ready value for a field. Returns { value } | { error } | { skip }. */
function coerceField(field, raw, ctx) {
  if (isBlank(raw)) {
    if (field.required) return { error: `${field.label} is required` }
    if (field.ownerDefault) return { value: ctx.userName }
    if (field.default !== undefined) return { value: field.default }
    return { skip: true }
  }

  switch (field.type) {
    case 'email': {
      const v = String(raw).trim().toLowerCase()
      if (!isValidEmail(v)) return { error: `Invalid email "${v}". Must be a valid email format (e.g. user@gmail.com)` }
      return { value: v }
    }
    case 'phone': {
      const digits = String(raw).replace(/\D/g, '')
      if (digits.length !== 10) return { error: `${field.label} must be exactly 10 digits (got "${raw}")` }
      return { value: digits }
    }
    case 'number':
    case 'integer': {
      const cleaned = String(raw).replace(/[,\s]/g, '').replace(/^[^\d.-]+/, '')
      const n = Number(cleaned)
      if (cleaned === '' || Number.isNaN(n)) return { error: `${field.label} must be a number` }
      return { value: field.type === 'integer' ? Math.round(n) : n }
    }
    case 'date':
      return parseDate(raw)
    case 'enum': {
      const s = String(raw).trim()
      const low = s.toLowerCase()
      const opt = field.options.find(o => o.toLowerCase() === low)
      if (opt) return { value: opt }
      const syn = field.synonyms?.[low]
      if (syn) return { value: syn }
      return { error: `${field.label} "${s}" must be one of: ${field.options.join(', ')}` }
    }
    case 'lookup':
      return { value: String(raw).trim() }
    default:
      return { value: raw instanceof Date ? toISODate(raw) : String(raw).trim() }
  }
}

/** Build an insert payload + lookup names + validation errors for one spreadsheet row. */
function buildRow(cells, headers, mapping, fields, ctx) {
  const rawByKey = {}
  headers.forEach((h, i) => {
    const key = mapping[h]
    if (key) rawByKey[key] = cells[i]
  })

  const payload = {}
  const lookups = {}
  const errors = []
  const display = {}

  fields.forEach(f => {
    const res = coerceField(f, rawByKey[f.key], ctx)
    if (res.error) {
      errors.push(res.error)
      display[f.key] = isBlank(rawByKey[f.key]) ? '' : String(rawByKey[f.key])
      return
    }
    if (res.skip) return
    display[f.key] = res.value
    if (f.type === 'lookup') { lookups[f.key] = res.value; return }
    payload[f.key] = res.value
  })

  return { payload, lookups, errors, display }
}

const fileExtension = (name) => '.' + String(name || '').split('.').pop().toLowerCase()

/* --------------------------------- styles -------------------------------- */

const S = {
  dropzone: (active) => ({
    border: `2px dashed ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-light)' : 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '36px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'var(--transition)'
  }),
  subtle: { fontSize: 13, color: 'var(--text-muted)' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)', fontSize: 13
  },
  tableWrap: {
    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
    overflow: 'auto', maxHeight: 260
  },
  th: {
    position: 'sticky', top: 0, background: 'var(--bg-secondary)', fontSize: 12,
    textAlign: 'left', padding: '10px 12px', whiteSpace: 'nowrap', zIndex: 1
  },
  td: { padding: '8px 12px', fontSize: 13, verticalAlign: 'top', borderTop: '1px solid var(--border-subtle)' },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '20px 0 10px' },
  stat: (color) => ({
    flex: 1, minWidth: 120, padding: '12px 16px', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
    borderLeft: `4px solid ${color}`
  }),
  progressTrack: { height: 10, background: 'var(--bg-secondary)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-subtle)' },
  progressBar: (pct) => ({ height: '100%', width: `${pct}%`, background: 'var(--accent)', transition: 'width 0.2s ease' })
}

/* -------------------------------- component ------------------------------ */

export default function BulkUploadModal({ module, isOpen, onClose, session, profile, onImported, extraDefaults }) {
  const config = IMPORT_CONFIGS[module]
  const inputRef = useRef(null)

  const [step, setStep] = useState('upload')      // upload | map | importing | done
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])            // [{ rowNumber, cells }]
  const [mapping, setMapping] = useState({})
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState(null)

  const userName = profile?.name || session?.user?.email || 'Unknown user'
  const userIds = profile?.teamUserIds || [session?.user?.id]
  const ctx = useMemo(() => ({ userName }), [userName])

  useEffect(() => {
    if (!isOpen) {
      setStep('upload'); setFile(null); setHeaders([]); setRows([])
      setMapping({}); setProgress({ done: 0, total: 0 }); setResult(null); setDragActive(false)
    }
  }, [isOpen])

  const prepared = useMemo(() => {
    if (!config) return []
    return rows.map(r => ({ rowNumber: r.rowNumber, ...buildRow(r.cells, headers, mapping, config.fields, ctx) }))
  }, [rows, headers, mapping, config, ctx])

  const validRows = useMemo(() => prepared.filter(r => r.errors.length === 0), [prepared])
  const invalidRows = useMemo(() => prepared.filter(r => r.errors.length > 0), [prepared])
  const mappedKeys = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping])
  const missingRequired = useMemo(
    () => (config ? config.fields.filter(f => f.required && !mappedKeys.has(f.key)) : []),
    [config, mappedKeys]
  )
  const previewFields = useMemo(
    () => (config ? config.fields.filter(f => mappedKeys.has(f.key)) : []),
    [config, mappedKeys]
  )

  if (!isOpen || !config) return null

  /* ------------------------------ templates ------------------------------ */

  const downloadTemplate = (bookType) => {
    try {
      const ws = XLSX.utils.json_to_sheet(config.sampleRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, config.label)
      XLSX.writeFile(wb, `${module}_import_template.${bookType}`, { bookType })
    } catch (err) {
      toast.error(`Could not generate template: ${err.message}`)
    }
  }

  /* -------------------------------- parsing ------------------------------ */

  const handleFile = async (picked) => {
    if (!picked) return
    const ext = fileExtension(picked.name)
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type. Please upload ${ACCEPTED_EXTENSIONS.join(', ')}`)
      return
    }
    const toastId = toast.loading('Reading file...')
    try {
      const buffer = await picked.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error('The file has no sheets')

      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true, raw: true })
      const headerIdx = aoa.findIndex(r => r.some(c => !isBlank(c)))
      if (headerIdx === -1) throw new Error('The file is empty')

      const rawHeaders = aoa[headerIdx].map((h, i) => {
        const label = isBlank(h) ? '' : String(h).trim()
        return label || `Column ${i + 1}`
      })
      const seen = {}
      const uniqueHeaders = rawHeaders.map(h => {
        seen[h] = (seen[h] || 0) + 1
        return seen[h] > 1 ? `${h} (${seen[h]})` : h
      })

      const dataRows = []
      aoa.slice(headerIdx + 1).forEach((cells, i) => {
        if (cells.some(c => !isBlank(c))) dataRows.push({ rowNumber: headerIdx + i + 2, cells })
      })
      if (dataRows.length === 0) throw new Error('No data rows found under the header row')

      setFile(picked)
      setHeaders(uniqueHeaders)
      setRows(dataRows)
      setMapping(autoMapColumns(uniqueHeaders, config.fields))
      setStep('map')
      toast.success(`${dataRows.length} row${dataRows.length === 1 ? '' : 's'} loaded`, { id: toastId })
    } catch (err) {
      toast.error(err.message || 'Failed to read file', { id: toastId })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    handleFile(e.dataTransfer?.files?.[0])
  }

  const setColumnMapping = (header, key) => {
    setMapping(prev => {
      const next = { ...prev }
      if (key) Object.keys(next).forEach(h => { if (h !== header && next[h] === key) next[h] = SKIP })
      next[header] = key
      return next
    })
  }

  /* -------------------------------- import ------------------------------- */

  const runImport = async () => {
    if (missingRequired.length || validRows.length === 0) return
    setStep('importing')
    setProgress({ done: 0, total: validRows.length })

    try {
      // 1. Resolve name-based lookups (e.g. Account Name -> account_id)
      const lookupFields = config.fields.filter(f => f.type === 'lookup' && mappedKeys.has(f.key))
      const lookupMaps = {}
      let unresolved = 0

      for (const f of lookupFields) {
        const { table, matchColumn, createIfMissing, ownerKey } = f.lookup
        const { data, error } = await supabase.from(table).select(`id, ${matchColumn}`).in('user_id', userIds)
        if (error) throw error
        const map = new Map()
        ;(data || []).forEach(r => {
          const k = String(r[matchColumn] || '').trim().toLowerCase()
          if (k && !map.has(k)) map.set(k, r.id)
        })

        if (createIfMissing) {
          const missing = new Map()
          validRows.forEach(r => {
            const name = r.lookups[f.key]
            if (name && !map.has(name.toLowerCase()) && !missing.has(name.toLowerCase())) missing.set(name.toLowerCase(), name)
          })
          if (missing.size) {
            const toCreate = [...missing.values()].map(name => ({
              [matchColumn]: name,
              user_id: session.user.id,
              ...createIfMissing,
              ...(ownerKey ? { [ownerKey]: userName } : {})
            }))
            const { data: created, error: cErr } = await supabase.from(table).insert(toCreate).select(`id, ${matchColumn}`)
            if (cErr) throw cErr
            ;(created || []).forEach(r => map.set(String(r[matchColumn]).trim().toLowerCase(), r.id))
          }
        }
        lookupMaps[f.key] = map
      }

      // 2. Assemble payloads
      const payloads = validRows.map(r => {
        const p = { ...(extraDefaults || {}), ...r.payload, user_id: session.user.id }
        lookupFields.forEach(f => {
          const name = r.lookups[f.key]
          const id = name ? lookupMaps[f.key].get(name.toLowerCase()) : null
          if (name && !id) unresolved++
          p[f.lookup.targetKey] = id || null
        })
        return p
      })

      // 3. Insert in batches; isolate failures row-by-row when a batch fails
      let inserted = 0
      const failed = []
      const insertedRows = []

      for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
        const chunk = payloads.slice(i, i + BATCH_SIZE)
        const { data, error } = await supabase.from(config.table).insert(chunk).select()
        if (!error) {
          inserted += chunk.length
          insertedRows.push(...(data || []))
        } else {
          for (let j = 0; j < chunk.length; j++) {
            const { data: one, error: e1 } = await supabase.from(config.table).insert([chunk[j]]).select()
            if (e1) failed.push({ row: validRows[i + j].rowNumber, error: e1.message })
            else { inserted++; insertedRows.push(...(one || [])) }
          }
        }
        setProgress({ done: Math.min(i + chunk.length, payloads.length), total: payloads.length })
      }

      // 4. Module-specific follow-ups (mirror the single-record create flow)
      if (module === 'accounts' && insertedRows.length) {
        const contacts = insertedRows.map(a => ({
          account_id: a.id,
          name: a.account_name,
          phone: a.phone || null,
          email: a.email || null,
          user_id: session.user.id
        }))
        const { error: ctErr } = await supabase.from('contacts').insert(contacts)
        if (ctErr) console.error('Failed to create linked contacts for imported accounts', ctErr)
      }

      // 5. Activity log
      if (inserted > 0) {
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Bulk Import',
          description: `${userName} bulk imported ${inserted} ${inserted === 1 ? config.singular : config.plural} from ${file?.name || 'a spreadsheet'}`
        }])
      }

      setResult({ inserted, failed, skipped: invalidRows.length, unresolved })
      setStep('done')
      if (inserted > 0) {
        toast.success(`Imported ${inserted} ${inserted === 1 ? config.singular : config.plural}`)
        onImported?.()
      } else {
        toast.error('No records were imported')
      }
    } catch (err) {
      console.error(err)
      toast.error(`Import failed: ${err.message}`)
      setStep('map')
    }
  }

  /* --------------------------------- render ------------------------------ */

  const closeIfIdle = () => { if (step !== 'importing') onClose() }

  return (
    <div className="modal-overlay">
      <div className="modal modal-xl" style={{ maxWidth: 960 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Import {config.label} from Excel / CSV</h2>
            <div style={S.subtle}>
              {step === 'upload' && 'Upload a spreadsheet or download a template to get started.'}
              {step === 'map' && 'Check the column mapping and preview before importing.'}
              {step === 'importing' && 'Importing records, please keep this window open.'}
              {step === 'done' && 'Import complete.'}
            </div>
          </div>
          <button className="modal-close" onClick={closeIfIdle} disabled={step === 'importing'}>✕</button>
        </div>

        {/* ------------------------------ STEP: UPLOAD ------------------------------ */}
        {step === 'upload' && (
          <div>
            <div
              style={S.dropzone(dragActive)}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
              onDrop={onDrop}
            >
              <UploadCloud size={40} style={{ color: 'var(--accent)', marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>Drag & drop your file here, or click to browse</div>
              <div style={{ ...S.subtle, marginTop: 6 }}>Supports .xlsx, .xls and .csv. The first sheet and first non-empty row (headers) are used.</div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <div style={S.sectionTitle}>Need a starting point?</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => downloadTemplate('xlsx')}>
                <Download size={16} style={{ marginRight: 6 }} /> Download Excel Template
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => downloadTemplate('csv')}>
                <Download size={16} style={{ marginRight: 6 }} /> Download CSV Template
              </button>
            </div>

            <div style={S.sectionTitle}>Supported columns</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {config.fields.map(f => (
                <span key={f.key} style={S.chip}>
                  {f.label}
                  {f.required && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>*</span>}
                  {f.type === 'enum' && <span style={S.subtle}>({f.options.join(' / ')})</span>}
                </span>
              ))}
            </div>
            <div style={{ ...S.subtle, marginTop: 10 }}>
              * Required. Column headers are matched automatically, and anything unmatched can be mapped by hand in the next step.
              Blank owner columns default to you ({userName}).
            </div>
          </div>
        )}

        {/* ------------------------------- STEP: MAP -------------------------------- */}
        {step === 'map' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <span style={S.chip}>
                <FileSpreadsheet size={16} style={{ color: 'var(--accent)' }} />
                <strong>{file?.name}</strong>
                <span style={S.subtle}>{rows.length} row{rows.length === 1 ? '' : 's'} · {headers.length} column{headers.length === 1 ? '' : 's'}</span>
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep('upload')}>
                <ArrowLeft size={14} style={{ marginRight: 4 }} /> Change file
              </button>
            </div>

            {missingRequired.length > 0 && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={16} />
                Map a column to {missingRequired.map(f => `"${f.label}"`).join(', ')} to continue.
              </div>
            )}

            <div style={S.sectionTitle}>Column mapping</div>
            <div style={S.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>File column</th>
                    <th style={S.th}>Sample value</th>
                    <th style={S.th}>Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h, i) => {
                    const sample = rows.find(r => !isBlank(r.cells[i]))?.cells[i]
                    return (
                      <tr key={h}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{h}</td>
                        <td style={{ ...S.td, color: 'var(--text-muted)' }}>
                          {sample instanceof Date ? toISODate(sample) : String(sample ?? '')}
                        </td>
                        <td style={S.td}>
                          <select
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: 13 }}
                            value={mapping[h] || SKIP}
                            onChange={(e) => setColumnMapping(h, e.target.value)}
                          >
                            <option value={SKIP}>— Skip this column —</option>
                            {config.fields.map(f => (
                              <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <div style={S.stat('var(--success)')}>
                <div style={S.subtle}>Ready to import</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{validRows.length}</div>
              </div>
              <div style={S.stat(invalidRows.length ? 'var(--danger)' : 'var(--border)')}>
                <div style={S.subtle}>Will be skipped</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{invalidRows.length}</div>
              </div>
            </div>

            <div style={S.sectionTitle}>Preview (first {Math.min(PREVIEW_ROWS, prepared.length)} of {prepared.length})</div>
            <div style={S.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    {previewFields.map(f => <th key={f.key} style={S.th}>{f.label}</th>)}
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {prepared.slice(0, PREVIEW_ROWS).map(r => (
                    <tr key={r.rowNumber} style={r.errors.length ? { background: 'rgba(239,68,68,0.06)' } : undefined}>
                      <td style={{ ...S.td, color: 'var(--text-muted)' }}>{r.rowNumber}</td>
                      {previewFields.map(f => (
                        <td key={f.key} style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.display[f.key] === undefined || r.display[f.key] === null ? '' : String(r.display[f.key])}
                        </td>
                      ))}
                      <td style={S.td}>
                        {r.errors.length === 0
                          ? <span className="badge badge-active">Valid</span>
                          : <span style={{ color: 'var(--danger)', fontSize: 12 }}>{r.errors.join('; ')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > PREVIEW_ROWS && (
              <div style={{ ...S.subtle, marginTop: 8 }}>
                {invalidRows.length} row{invalidRows.length === 1 ? '' : 's'} have issues and will be skipped. Fix them in the file or adjust the mapping above.
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={missingRequired.length > 0 || validRows.length === 0}
                onClick={runImport}
              >
                <UploadCloud size={16} style={{ marginRight: 6 }} />
                Import {validRows.length} {validRows.length === 1 ? config.singular : config.plural}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------- STEP: IMPORTING ---------------------------- */}
        {step === 'importing' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
              <span>Inserting {config.plural}…</span>
              <span style={S.subtle}>{progress.done} / {progress.total}</span>
            </div>
            <div style={S.progressTrack}>
              <div style={S.progressBar(progress.total ? (progress.done / progress.total) * 100 : 0)} />
            </div>
            <div style={{ ...S.subtle, marginTop: 12 }}>Records are written in batches of {BATCH_SIZE}. Please don't close this window.</div>
          </div>
        )}

        {/* ------------------------------ STEP: DONE ------------------------------- */}
        {step === 'done' && result && (
          <div>
            <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
              {result.inserted > 0
                ? <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
                : <XCircle size={48} style={{ color: 'var(--danger)' }} />}
              <h3 style={{ margin: '12px 0 4px', fontSize: 18, fontWeight: 800 }}>
                {result.inserted} {result.inserted === 1 ? config.singular : config.plural} imported
              </h3>
              <div style={S.subtle}>from {file?.name}</div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={S.stat('var(--success)')}>
                <div style={S.subtle}>Imported</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{result.inserted}</div>
              </div>
              <div style={S.stat(result.skipped ? 'var(--warning, #f59e0b)' : 'var(--border)')}>
                <div style={S.subtle}>Skipped (validation)</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{result.skipped}</div>
              </div>
              <div style={S.stat(result.failed.length ? 'var(--danger)' : 'var(--border)')}>
                <div style={S.subtle}>Failed (database)</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{result.failed.length}</div>
              </div>
            </div>

            {result.unresolved > 0 && (
              <div style={{ ...S.subtle, marginTop: 14 }}>
                {result.unresolved} linked name{result.unresolved === 1 ? '' : 's'} (contact / account) could not be matched to an existing record and were left blank.
              </div>
            )}

            {result.failed.length > 0 && (
              <>
                <div style={S.sectionTitle}>Rows that could not be saved</div>
                <div style={S.tableWrap}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th style={S.th}>Row</th><th style={S.th}>Error</th></tr>
                    </thead>
                    <tbody>
                      {result.failed.map(f => (
                        <tr key={f.row}>
                          <td style={S.td}>{f.row}</td>
                          <td style={{ ...S.td, color: 'var(--danger)' }}>{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep('upload')}>Import another file</button>
              <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
