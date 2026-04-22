const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'config', 'db-portability-baseline.json');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeRelativePath(filePath) {
    return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function shouldIgnore(relativePath, config) {
    const pathParts = relativePath.split('/');
    if (pathParts.some((part) => config.ignoredDirectories.includes(part))) {
        return true;
    }

    return config.ignoredPathFragments.some((fragment) => relativePath.includes(fragment));
}

function listFiles(currentPath, config, accumulator = []) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = normalizeRelativePath(fullPath);

        if (shouldIgnore(relativePath, config)) {
            continue;
        }

        if (entry.isDirectory()) {
            listFiles(fullPath, config, accumulator);
            continue;
        }

        if (!config.scanExtensions.includes(path.extname(entry.name))) {
            continue;
        }

        accumulator.push({ fullPath, relativePath });
    }

    return accumulator;
}

function countMatches(text, regex) {
    const matches = text.match(regex);
    return matches ? matches.length : 0;
}

function main() {
    const config = readJson(configPath);
    const patterns = config.forbiddenPatterns.map((item) => ({
        ...item,
        regex: new RegExp(item.pattern, 'gim')
    }));
    const files = listFiles(repoRoot, config);
    const violations = [];

    for (const file of files) {
        const text = fs.readFileSync(file.fullPath, 'utf8');
        const baseline = config.legacyAllowances[file.relativePath] || null;

        for (const pattern of patterns) {
            const matches = countMatches(text, pattern.regex);

            if (matches === 0) {
                continue;
            }

            if (baseline) {
                const allowed = Number(baseline[pattern.id] || 0);
                if (matches > allowed) {
                    violations.push({
                        relativePath: file.relativePath,
                        patternId: pattern.id,
                        matches,
                        allowed,
                        message: `${pattern.message} Se detectaron ${matches} ocurrencias y el baseline permite ${allowed}.`
                    });
                }
                continue;
            }

            violations.push({
                relativePath: file.relativePath,
                patternId: pattern.id,
                matches,
                allowed: 0,
                message: `${pattern.message} Se detectaron ${matches} ocurrencias en un archivo no marcado como legacy.`
            });
        }
    }

    if (violations.length === 0) {
        console.log('OK: no se detectaron nuevos patrones acoplados a PostgreSQL fuera del baseline.');
        process.exit(0);
    }

    console.error('Se detectaron patrones que rompen la linea base de portabilidad de base de datos:');
    for (const violation of violations) {
        console.error(`- ${violation.relativePath} [${violation.patternId}]`);
        console.error(`  ${violation.message}`);
    }

    process.exit(1);
}

main();
