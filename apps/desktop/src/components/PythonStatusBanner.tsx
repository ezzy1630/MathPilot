import { useEffect, useState } from 'react'
import { isTauriRuntime } from '../lib/nativeChrome'

type CheckerIssue = 'sympy' | 'script' | 'python' | null

function parseCheckerIssue(raw: string): CheckerIssue {
  try {
    const parsed = JSON.parse(raw) as { ok?: boolean; error?: string }
    if (parsed.ok !== false) return null
    if (parsed.error === 'sympy_not_installed') return 'sympy'
    if (parsed.error === 'math_check_script_missing') return 'script'
    return 'python'
  } catch {
    return 'python'
  }
}

export function PythonStatusBanner() {
  const [issue, setIssue] = useState<CheckerIssue>(null)

  useEffect(() => {
    if (!isTauriRuntime()) return
    void import('@tauri-apps/api/core')
      .then(({ invoke }) =>
        invoke<string>('check_math_symbolic', {
          input: { expected: '1', actual: '1', variables: ['x'] },
        }),
      )
      .then((raw) => setIssue(parseCheckerIssue(raw)))
      .catch(() => setIssue('python'))
  }, [])

  if (!issue) return null

  const detail =
    issue === 'sympy' ? (
      <>
        SymPy is not installed for the Python MathPilot uses. From the MathPilot folder run{' '}
        <code>{'python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt'}</code>, then restart.
        Or install SymPy for system Python with <code>pip3 install sympy</code>. Until then,
        answers use numeric/string fallback only.
      </>
    ) : issue === 'script' ? (
      <>Math checking script was not found in the app bundle. Reinstall MathPilot from a fresh build.</>
    ) : (
      <>
        Python 3 could not run the math checker. Install Python 3 and SymPy (<code>pip3 install sympy</code>), then
        restart.
      </>
    )

  return (
    <div className="python-status-banner" role="status">
      {detail}
    </div>
  )
}
