import { readFile, writeFile } from 'node:fs/promises';

export async function buildTheme() {
  const source = await readFile('node_modules/@astryxdesign/theme-matcha/dist/theme.css', 'utf-8');
  
  // Replace tokens with modern PACE Gamified Brand Palette (Zero forest green, zero muddy cream)
  let customized = source
    .replace(/--font-family-heading:\s*["'][^"']+["'][^;]*;/g, "--font-family-heading: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;")
    .replace(/--font-family-body:\s*["'][^"']+["'][^;]*;/g, "--font-family-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;")
    .replace(/--color-accent:\s*light-dark\([^)]+\);/g, '--color-accent: #FF9600;')
    .replace(/--color-accent-muted:\s*light-dark\([^)]+\);/g, '--color-accent-muted: #FFF4E5;')
    .replace(/--color-background-body:\s*light-dark\([^)]+\);/g, '--color-background-body: #F8FAFC;')
    .replace(/--color-background-surface:\s*light-dark\([^)]+\);/g, '--color-background-surface: #FFFFFF;')
    .replace(/--color-background-card:\s*light-dark\([^)]+\);/g, '--color-background-card: #FFFFFF;')
    .replace(/--color-background-muted:\s*light-dark\([^)]+\);/g, '--color-background-muted: #F1F5F9;')
    .replace(/--color-text-primary:\s*light-dark\([^)]+\);/g, '--color-text-primary: #0F172A;')
    .replace(/--color-text-secondary:\s*light-dark\([^)]+\);/g, '--color-text-secondary: #64748B;')
    .replace(/--color-text-accent:\s*light-dark\([^)]+\);/g, '--color-text-accent: #FF9600;')
    .replace(/--color-icon-accent:\s*light-dark\([^)]+\);/g, '--color-icon-accent: #FF9600;')
    .replace(/--color-icon-primary:\s*light-dark\([^)]+\);/g, '--color-icon-primary: #0F172A;')
    .replace(/--color-icon-secondary:\s*light-dark\([^)]+\);/g, '--color-icon-secondary: #64748B;')
    .replace(/--color-success:\s*light-dark\([^)]+\);/g, '--color-success: #58CC02;')
    .replace(/--color-success-muted:\s*var\([^)]+\);/g, '--color-success-muted: #DCFCE7;')
    .replace(/--color-border:\s*light-dark\([^)]+\);/g, '--color-border: #E2E8F0;');

  await writeFile('assets/astryx-matcha.css', customized, 'utf-8');
  console.log('Built assets/astryx-matcha.css with modern PACE brand tokens');
}

if (process.argv[1] && process.argv[1].endsWith('build-theme.mjs')) {
  buildTheme().catch(console.error);
}
