'use client'

import { useState } from 'react'

export default function OpenAIBackfillPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [limit, setLimit] = useState(10)

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/openai/projects/backfill-all?limit=${limit}`)
      const data = await res.json()
      setCompanies(data.companies || [])
      setResult({ type: 'info', message: `Found ${data.total} companies without OpenAI projects` })
    } catch (error: any) {
      setResult({ type: 'error', message: error.message })
    }
    setLoading(false)
  }

  const runBackfill = async (dryRun: boolean = false) => {
    if (!dryRun && !confirm(`Create OpenAI projects for ${companies.length} companies?`)) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/openai/projects/backfill-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit, dryRun })
      })

      const data = await res.json()
      setResult(data)

      if (data.ok && !dryRun) {
        // Refresh the list
        await fetchCompanies()
      }
    } catch (error: any) {
      setResult({ type: 'error', ok: false, message: error.message })
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 40, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>OpenAI Project Backfill</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>
        Create OpenAI projects for existing companies that don't have one yet.
      </p>

      <div style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: 12, 
        padding: 24,
        marginBottom: 24
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Limit (max companies to process):
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
            min={1}
            max={1000}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 14,
              width: 120
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={fetchCompanies}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Check Companies'}
          </button>

          <button
            onClick={() => runBackfill(true)}
            disabled={loading || companies.length === 0}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: loading || companies.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || companies.length === 0 ? 0.6 : 1
            }}
          >
            Dry Run (Preview)
          </button>

          <button
            onClick={() => runBackfill(false)}
            disabled={loading || companies.length === 0}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: loading || companies.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || companies.length === 0 ? 0.6 : 1
            }}
          >
            Run Backfill (Create Projects)
          </button>
        </div>
      </div>

      {result && (
        <div style={{
          background: result.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${result.ok ? '#86efac' : '#fca5a5'}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>
            {result.ok ? '✅ Success' : '❌ Error'}
          </h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {result.message || JSON.stringify(result, null, 2)}
          </p>

          {result.summary && (
            <div style={{ marginTop: 16, padding: 12, background: 'white', borderRadius: 8 }}>
              <strong>Summary:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li>Total: {result.summary.total}</li>
                <li>Success: {result.summary.success}</li>
                <li>Failed: {result.summary.failed}</li>
              </ul>
            </div>
          )}

          {result.results && result.results.length > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                View Details ({result.results.length} items)
              </summary>
              <div style={{ 
                marginTop: 12, 
                maxHeight: 400, 
                overflow: 'auto',
                background: 'white',
                padding: 12,
                borderRadius: 8
              }}>
                {result.results.map((r: any, i: number) => (
                  <div key={i} style={{ 
                    padding: '8px 0', 
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: 14
                  }}>
                    <div style={{ fontWeight: 600 }}>
                      {r.success ? '✅' : '❌'} {r.companyName}
                    </div>
                    {r.projectId && (
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        Project: {r.projectId}
                      </div>
                    )}
                    {r.error && (
                      <div style={{ color: '#ef4444', fontSize: 12 }}>
                        Error: {r.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {companies.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 24
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>
            Companies Without Projects ({companies.length})
          </h2>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Industry</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>ID</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company: any) => (
                  <tr key={company.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px' }}>{company.name}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {company.industry || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8' }}>
                      {company.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{
        marginTop: 32,
        padding: 20,
        background: '#fffbeb',
        border: '1px solid #fde047',
        borderRadius: 12
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>⚠️ Important Notes</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#78716c' }}>
          <li>Requires <code>OPENAI_API_KEY</code> environment variable</li>
          <li>Rate limited to 1 request per 500ms to avoid API throttling</li>
          <li>Use "Dry Run" first to preview changes</li>
          <li>New companies automatically get projects on registration</li>
          <li>Check OpenAI Platform to verify projects: https://platform.openai.com/settings/organization/projects</li>
        </ul>
      </div>
    </div>
  )
}
