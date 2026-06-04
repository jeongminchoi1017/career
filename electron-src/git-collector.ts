import simpleGit from 'simple-git'
import { insertLog, getLogs, getSetting } from './db'

const TECH_PATTERNS: [RegExp, string][] = [
  [/\.(tsx?|jsx?)$/, 'TypeScript'],
  [/\.py$/, 'Python'],
  [/\.go$/, 'Go'],
  [/\.rs$/, 'Rust'],
  [/\.java$/, 'Java'],
  [/\.(css|scss|sass)$/, 'CSS'],
  [/tailwind/, 'Tailwind CSS'],
  [/prisma/, 'Prisma'],
  [/docker/i, 'Docker'],
  [/\.(sql|db)$/, 'SQL'],
  [/package\.json/, 'Node.js'],
  [/requirements\.txt/, 'Python'],
  [/next\.config/, 'Next.js'],
  [/nest/, 'NestJS'],
  [/vite\.config/, 'Vite'],
  [/jest\.config/, 'Jest'],
]

function inferTechs(files: string[], message: string): string[] {
  const techs = new Set<string>()
  for (const file of files) {
    for (const [pattern, tech] of TECH_PATTERNS) {
      if (pattern.test(file)) techs.add(tech)
    }
  }
  // message-based hints
  if (/react/i.test(message)) techs.add('React')
  if (/typescript|\.ts/i.test(message)) techs.add('TypeScript')
  if (/docker/i.test(message)) techs.add('Docker')
  if (/test/i.test(message)) techs.add('Jest')
  return [...techs].slice(0, 6)
}

export async function collectGitLogs() {
  const reposRaw = getSetting('git_repos')
  if (!reposRaw) return

  let repos: string[] = []
  try {
    repos = JSON.parse(reposRaw)
  } catch {
    return
  }

  for (const repoPath of repos) {
    try {
      await collectRepo(repoPath)
    } catch (e) {
      console.error(`Git collect failed for ${repoPath}:`, e)
    }
  }
}

async function collectRepo(repoPath: string) {
  const git = simpleGit(repoPath)

  // 현재 사용자 이메일로 필터링
  let authorEmail = ''
  try {
    authorEmail = (await git.raw(['config', 'user.email'])).trim()
  } catch {
    // git config 없으면 필터 없이 수집
  }

  const logOptions: Record<string, unknown> = { maxCount: 100 }
  if (authorEmail) logOptions['--author'] = authorEmail

  const log = await git.log(logOptions)

  const existingHashes = new Set(
    (getLogs() as Array<{ commit_hash: string | null }>)
      .filter(l => l.commit_hash)
      .map(l => l.commit_hash!)
  )

  for (const commit of log.all) {
    if (existingHashes.has(commit.hash)) continue

    let files: string[] = []
    try {
      const diff = await git.show(['--name-only', '--format=', commit.hash])
      files = diff.split('\n').filter(Boolean)
    } catch {
      // ignore
    }

    const techs = inferTechs(files, commit.message)

    insertLog({
      timestamp: new Date(commit.date).toISOString(),
      source: 'git',
      description: commit.message,
      techs,
      repo: repoPath,
      commit_hash: commit.hash,
    })
  }
}
