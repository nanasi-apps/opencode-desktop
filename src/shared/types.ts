export type InstallStatus = 'idle' | 'checking' | 'installing' | 'installed' | 'error'

export type ProcessStatus = 'stopped' | 'starting' | 'running' | 'error'

export type TunnelStatus = 'stopped' | 'starting' | 'running' | 'error'

export type InstallMode = 'auto' | 'advanced'

export type PackageManager = 'brew' | 'npm'

export type ClaudeMode = 'no' | 'yes' | 'max20'

export interface OmoInstallOptions {
  claude: ClaudeMode
  openai: 'yes' | 'no'
  gemini: 'yes' | 'no'
  copilot: 'yes' | 'no'
  opencodeZen: 'yes' | 'no'
  zaiCodingPlan: 'yes' | 'no'
}

export interface InstallConfig {
  mode: InstallMode
  packageManager?: PackageManager
  omoOptions: OmoInstallOptions
}

export interface OverallStatus {
  opencodeInstalled: boolean
  omoInstalled: boolean
  webProcessStatus: ProcessStatus
  webPort: number | null
}

export interface InstallResult {
  success: boolean
  output: string
}

export interface ProcessInfo {
  status: ProcessStatus
  port: number | null
  pid: number | null
}

export interface TunnelInfo {
  status: TunnelStatus
  publicUrl: string | null
  error: string | null
  pid: number | null
}
