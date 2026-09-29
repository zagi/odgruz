export type Locale = 'en' | 'pl'

export interface DiskUsage {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  mount: string
}

export type Category = 'cache' | 'optional'

export interface SafeRoots {
  home: string
  appsDir: string
  systemLibraryDir: string
}

export interface TargetContext extends SafeRoots {
  projectsDir: string
  inactiveDays: number
  now: Date
  /** realpath uruchomionego skryptu CLI; null gdy nieznany */
  selfPath: string | null
}

export interface Target {
  id: string
  label: string
  category: Category
  impact: string
  discover(ctx: TargetContext): Promise<string[]>
}

export interface ScanItem {
  path: string
  bytes: number
}

export interface ScanResult {
  target: Target
  items: ScanItem[]
  totalBytes: number
}

export interface CleanFailure {
  path: string
  error: string
}

export interface CleanOutcome {
  targetId: string
  removed: string[]
  failed: CleanFailure[]
}

export interface ReportData {
  generatedAt: Date
  before: DiskUsage
  after: DiskUsage
  results: ScanResult[]
  outcomes: CleanOutcome[]
  dryRun: boolean
}
