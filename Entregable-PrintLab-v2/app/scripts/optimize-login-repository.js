const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const loginRepositoryDir = path.join(repoRoot, 'public', 'uploads', 'login-repository');

function isOptimizableLoginImage(fileName) {
    return /\.(png|jpe?g|webp|avif)$/i.test(String(fileName || '')) && !/\.optimized\.webp$/i.test(String(fileName || ''));
}

function buildOptimizedLoginRepositoryFileName(fileName) {
    const parsed = path.parse(String(fileName || ''));
    return `${parsed.name}.optimized.webp`;
}

function optimizeImage(sourcePath, targetPath) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-i', sourcePath,
            '-vf', "scale='min(1920,iw)':-2",
            '-frames:v', '1',
            '-compression_level', '6',
            '-quality', '78',
            targetPath
        ], {
            windowsHide: true
        });

        let stderr = '';
        ffmpeg.stderr.on('data', (chunk) => {
            stderr += String(chunk || '');
        });
        ffmpeg.on('error', reject);
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(stderr.trim() || `ffmpeg finalizó con código ${code}.`));
        });
    });
}

async function main() {
    if (!fs.existsSync(loginRepositoryDir)) {
        console.log('No existe el repositorio de login. Nada que optimizar.');
        return;
    }

    const entries = await fs.promises.readdir(loginRepositoryDir, { withFileTypes: true });
    let processed = 0;
    let skipped = 0;

    for (const entry of entries) {
        if (!entry.isFile()) {
            continue;
        }
        const fileName = entry.name;
        if (!isOptimizableLoginImage(fileName)) {
            skipped += 1;
            continue;
        }

        const sourcePath = path.join(loginRepositoryDir, fileName);
        const targetPath = path.join(loginRepositoryDir, buildOptimizedLoginRepositoryFileName(fileName));

        try {
            await optimizeImage(sourcePath, targetPath);
            const originalStats = await fs.promises.stat(sourcePath);
            const optimizedStats = await fs.promises.stat(targetPath);
            processed += 1;
            console.log(`${fileName} -> ${path.basename(targetPath)} (${Math.round(originalStats.size / 1024)} KB -> ${Math.round(optimizedStats.size / 1024)} KB)`);
        } catch (error) {
            skipped += 1;
            console.warn(`No fue posible optimizar ${fileName}: ${error.message}`);
        }
    }

    console.log(`Optimización finalizada. Procesadas: ${processed}. Omitidas: ${skipped}.`);
}

main().catch((error) => {
    console.error('Error optimizando el repositorio de login:', error.message);
    process.exit(1);
});
