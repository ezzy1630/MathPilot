import { useEffect, useState } from 'react'
import { isTauriRuntime } from '../lib/nativeChrome'

type CheckerIssue = 'sympy' | 'python' | null

export function PythonStatusBanner() {
  const [issue, setIssue] = useState<CheckerIssue>(null)

  useEffect(() => {
    if (!isTauriRuntime()) return
    void import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<{ sympy: boolean; python: string }>('runtime_self_test'))
      .then((result) => {
        if (result.sympy) {
          setIssue(null)
          return
        }
        setIssue(result.python === 'python3' ? 'python' : 'sympy')
      })
      .catch(() => setIssue('python'))
  }, [])

  if (!issue) return null

  const detail =
    issue === 'sympy' ? (
      <>
        Symbolic answer checking is unavailable in this build. Reinstall MathPilot from a release that includes the
        bundled Python runtime. Developers can run{' '}
        <code>./scripts/build-macos-python-runtime.sh</code> before <code>desktop:build</code>.
      </>
    ) : (
      <>
        Python 3 could not run the math checker. Reinstall MathPilot, or (developers) create{' '}
        <code>.venv</code> with <code>pip install -r scripts/requirements.txt</code>, then restart.
      </>
    )

  return (
    <div className="python-status-banner" role="status">
      {detail}
    </div>
  )
}
