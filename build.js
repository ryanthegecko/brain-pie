const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const OUT = 'dist';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const jsFiles = [
    'themes.js',
    'storage.js',
    'data-model.js',
    'example-data.js',
    'worker.js',
    'app.js',
    ...fs.readdirSync('adapters').filter(f => f.endsWith('.js')).map(f => `adapters/${f}`),
    ...fs.readdirSync('controllers').filter(f => f.endsWith('.js')).map(f => `controllers/${f}`),
    ...fs.readdirSync('managers').filter(f => f.endsWith('.js')).map(f => `managers/${f}`),
];

for (const file of jsFiles) {
    const outFile = path.join(OUT, file);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    esbuild.buildSync({
        entryPoints: [file],
        outfile: outFile,
        minify: true,
        bundle: false,
        target: ['esnext'],
    });
}

esbuild.buildSync({
    entryPoints: ['styles.css'],
    outfile: path.join(OUT, 'styles.css'),
    minify: true,
});

fs.copyFileSync('index.html', path.join(OUT, 'index.html'));
if (fs.existsSync('CNAME')) fs.copyFileSync('CNAME', path.join(OUT, 'CNAME'));
fs.cpSync('assets', path.join(OUT, 'assets'), { recursive: true });

console.log('Build complete → dist/');
