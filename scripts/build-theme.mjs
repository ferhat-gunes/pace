import { readFile, writeFile } from 'node:fs/promises';

export async function buildTheme() {
  const source = await readFile('node_modules/@astryxdesign/theme-matcha/dist/theme.css', 'utf-8');
  
  // Replace tokens with PACE Forest Brand Palette
  let customized = source
    .replace(/--font-family-heading:\s*["'][^"']+["'][^;]*;/g, "--font-family-heading: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;")
    .replace(/--font-family-body:\s*["'][^"']+["'][^;]*;/g, "--font-family-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;")
    .replace(/--color-accent:\s*light-dark\([^)]+\);/g, '--color-accent: #E8753B;')
    .replace(/--color-accent-muted:\s*light-dark\([^)]+\);/g, '--color-accent-muted: #FDF2EB;')
    .replace(/--color-background-body:\s*light-dark\([^)]+\);/g, '--color-background-body: #F4F0E6;')
    .replace(/--color-background-surface:\s*light-dark\([^)]+\);/g, '--color-background-surface: #FFFFFF;')
    .replace(/--color-background-card:\s*light-dark\([^)]+\);/g, '--color-background-card: #FFFFFF;')
    .replace(/--color-background-muted:\s*light-dark\([^)]+\);/g, '--color-background-muted: #FAF8F2;')
    .replace(/--color-text-primary:\s*light-dark\([^)]+\);/g, '--color-text-primary: #38352F;')
    .replace(/--color-text-secondary:\s*light-dark\([^)]+\);/g, '--color-text-secondary: #6B665E;')
    .replace(/--color-text-accent:\s*light-dark\([^)]+\);/g, '--color-text-accent: #E8753B;')
    .replace(/--color-icon-accent:\s*light-dark\([^)]+\);/g, '--color-icon-accent: #E8753B;')
    .replace(/--color-icon-primary:\s*light-dark\([^)]+\);/g, '--color-icon-primary: #38352F;')
    .replace(/--color-icon-secondary:\s*light-dark\([^)]+\);/g, '--color-icon-secondary: #6B665E;')
    .replace(/--color-success:\s*light-dark\([^)]+\);/g, '--color-success: #244C3A;')
    .replace(/--color-success-muted:\s*var\([^)]+\);/g, '--color-success-muted: #EFF3EC;')
    .replace(/--color-border:\s*light-dark\([^)]+\);/g, '--color-border: #E2DDD4;');

  await writeFile('assets/astryx-matcha.css', customized, 'utf-8');
  console.log('Built assets/astryx-matcha.css with PACE brand tokens');
}

if (process.argv[1] && process.argv[1].endsWith('build-theme.mjs')) {
  buildTheme().catch(console.error);
}
