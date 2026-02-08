export type InstallProgressTarget = 'homebrew' | 'opencode' | 'omo'

interface ProgressState {
  output: string
  updatedAt: number
}

const MAX_OUTPUT_CHARS = 120_000

const progressStore: Record<InstallProgressTarget, ProgressState> = {
  homebrew: { output: '', updatedAt: Date.now() },
  opencode: { output: '', updatedAt: Date.now() },
  omo: { output: '', updatedAt: Date.now() },
}

export function resetInstallProgress(target: InstallProgressTarget): void {
  progressStore[target] = { output: '', updatedAt: Date.now() }
}

export function appendInstallProgress(target: InstallProgressTarget, chunk: string): void {
  if (!chunk) return

  const next = progressStore[target].output + chunk
  progressStore[target] = {
    output: next.length > MAX_OUTPUT_CHARS ? next.slice(-MAX_OUTPUT_CHARS) : next,
    updatedAt: Date.now(),
  }
}

export function getInstallProgress(target: InstallProgressTarget): ProgressState {
  return progressStore[target]
}
