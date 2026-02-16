const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('NO_ERRORS');
} catch (e) {
  const stdout = e.stdout || '';
  const lines = stdout.split('\n').filter(l => l.includes('error TS'));
  const out = lines.map(l => {
    const m = l.match(/^(.*?)\((\d+),(\d+)\):\s*(error TS\d+):\s*(.*)/);
    if (m) return `${m[1]}:${m[2]} ${m[4]}: ${m[5].substring(0, 50)}`;
    return l.substring(0, 80);
  });
  console.log(`COUNT=${out.length}`);
  console.log(out.join('\n'));
}
