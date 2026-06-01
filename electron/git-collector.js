"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectGitLogs = collectGitLogs;
const simple_git_1 = __importDefault(require("simple-git"));
const db_1 = require("./db");
const TECH_PATTERNS = [
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
];
function inferTechs(files, message) {
    const techs = new Set();
    for (const file of files) {
        for (const [pattern, tech] of TECH_PATTERNS) {
            if (pattern.test(file))
                techs.add(tech);
        }
    }
    // message-based hints
    if (/react/i.test(message))
        techs.add('React');
    if (/typescript|\.ts/i.test(message))
        techs.add('TypeScript');
    if (/docker/i.test(message))
        techs.add('Docker');
    if (/test/i.test(message))
        techs.add('Jest');
    return [...techs].slice(0, 6);
}
async function collectGitLogs() {
    const reposRaw = (0, db_1.getSetting)('git_repos');
    if (!reposRaw)
        return;
    let repos = [];
    try {
        repos = JSON.parse(reposRaw);
    }
    catch {
        return;
    }
    for (const repoPath of repos) {
        try {
            await collectRepo(repoPath);
        }
        catch (e) {
            console.error(`Git collect failed for ${repoPath}:`, e);
        }
    }
}
async function collectRepo(repoPath) {
    const git = (0, simple_git_1.default)(repoPath);
    const log = await git.log({ maxCount: 50, '--all': null });
    const existingHashes = new Set((0, db_1.getLogs)()
        .filter(l => l.commit_hash)
        .map(l => l.commit_hash));
    for (const commit of log.all) {
        if (existingHashes.has(commit.hash))
            continue;
        let files = [];
        try {
            const diff = await git.show(['--name-only', '--format=', commit.hash]);
            files = diff.split('\n').filter(Boolean);
        }
        catch {
            // ignore
        }
        const techs = inferTechs(files, commit.message);
        (0, db_1.insertLog)({
            timestamp: new Date(commit.date).toISOString(),
            source: 'git',
            description: commit.message,
            techs,
            repo: repoPath,
            commit_hash: commit.hash,
        });
    }
}
