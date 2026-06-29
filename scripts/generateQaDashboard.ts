import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

interface CoverageFile {
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
  path: string;
}

interface FileCoverage {
  path: string;
  stmts: number;
  branches: number;
  funcs: number;
}

interface ModuleCoverage {
  label: string;
  totalStmts: number;
  coveredStmts: number;
  totalBranches: number;
  coveredBranches: number;
  totalFuncs: number;
  coveredFuncs: number;
  files: FileCoverage[];
  logicFiles: number;
  logicCovered: number;
  infraFiles: number;
}

interface TestFileResult {
  name: string;
  module: string;
  tests: number;
  passed: number;
  failed: number;
  durationMs: number;
}

function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function pctf(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function moduleKey(filePath: string): string {
  const n = filePath.replace(/\\/g, "/");
  const m = n.match(/(?:\/|^)src\/modules\/([^/]+)/);
  if (m) return m[1];
  const c = n.match(/(?:\/|^)src\/([^/]+)\//);
  if (c && c[1] !== "modules") return c[1];
  return "other";
}

function isLogicFile(path: string): boolean {
  return /use-cases|validators|middleware/.test(path);
}

function loadCoverage(): { modules: Map<string, ModuleCoverage>; totals: { stmts: number; branches: number; funcs: number } } {
  const cp = join(ROOT, "coverage", "coverage-final.json");
  if (!existsSync(cp)) {
    console.error("Coverage data not found. Run coverage first.");
    process.exit(1);
  }
  const raw: Record<string, any> = JSON.parse(readFileSync(cp, "utf-8"));
  const modules = new Map<string, ModuleCoverage>();
  let gStmts = 0, gCovSt = 0, gBr = 0, gCovBr = 0, gFn = 0, gCovFn = 0;

  for (const [absPath, data] of Object.entries(raw)) {
    const f: CoverageFile = data as any;
    const relPath = relative(ROOT, absPath).replace(/\\/g, "/");
    const key = moduleKey(relPath);
    if (!modules.has(key)) modules.set(key, { label: key, totalStmts: 0, coveredStmts: 0, totalBranches: 0, coveredBranches: 0, totalFuncs: 0, coveredFuncs: 0, files: [], logicFiles: 0, logicCovered: 0, infraFiles: 0 });
    const mod = modules.get(key)!;

    const sKeys = Object.keys(f.s);
    const sCov = sKeys.filter(k => f.s[k] > 0).length;
    const fKeys = Object.keys(f.f);
    const fCov = fKeys.filter(k => f.f[k] > 0).length;
    const bKeys = Object.keys(f.b);
    const bCov = bKeys.filter(k => f.b[k].length > 0 && f.b[k].every(h => h > 0)).length;
    const shortPath = relPath.includes("src/") ? relPath.slice(relPath.indexOf("src/")) : relPath;

    mod.totalStmts += sKeys.length; mod.coveredStmts += sCov;
    mod.totalFuncs += fKeys.length; mod.coveredFuncs += fCov;
    mod.totalBranches += bKeys.length; mod.coveredBranches += bCov;
    mod.files.push({ path: shortPath, stmts: pct(sCov, sKeys.length), branches: pct(bCov, bKeys.length), funcs: pct(fCov, fKeys.length) });
    if (isLogicFile(relPath)) { mod.logicFiles++; if (sCov === sKeys.length && sKeys.length > 0) mod.logicCovered++; }
    else { mod.infraFiles++; }

    gStmts += sKeys.length; gCovSt += sCov;
    gBr += bKeys.length; gCovBr += bCov;
    gFn += fKeys.length; gCovFn += fCov;
  }
  return { modules, totals: { stmts: pct(gCovSt, gStmts), branches: pct(gCovBr, gBr), funcs: pct(gCovFn, gFn) } };
}

function loadTestResults(): { summary: any; files: TestFileResult[] } {
  const rp = join(ROOT, ".qa", "test-results.json");
  if (!existsSync(rp)) { console.error("Test results not found."); process.exit(1); }
  const raw = JSON.parse(readFileSync(rp, "utf-8"));
  const files: TestFileResult[] = raw.testResults.map((suite: any) => {
    const abs = suite.name.replace(/\\/g, "/");
    const rel = abs.includes("src/") ? abs.slice(abs.lastIndexOf("src/")) : abs;
    const total = suite.assertionResults.length;
    const passed = suite.assertionResults.filter((t: any) => t.status === "passed").length;
    const failed = suite.assertionResults.filter((t: any) => t.status === "failed").length;
    const duration = suite.assertionResults.reduce((a: number, t: any) => a + (t.duration || 0), 0);
    return { name: rel, module: moduleKey(rel), tests: total, passed, failed, durationMs: Math.round(duration) };
  });
  const start = raw.startTime;
  return { summary: { totalSuites: raw.numTotalTestSuites, passedSuites: raw.numPassedTestSuites, failedSuites: raw.numFailedTestSuites, totalTests: raw.numTotalTests, passedTests: raw.numPassedTests, failedTests: raw.numFailedTests, durationSec: ((Date.now() - start) / 1000).toFixed(1) }, files };
}

function computeHealth(mod: ModuleCoverage): number {
  const s = pctf(mod.coveredStmts, mod.totalStmts);
  const b = pctf(mod.coveredBranches, mod.totalBranches);
  const f = pctf(mod.coveredFuncs, mod.totalFuncs);
  return Math.round(s * 0.5 + b * 0.3 + f * 0.2);
}

function coverageColor(v: number): string {
  if (v >= 90) return "#22c55e";
  if (v >= 75) return "#eab308";
  if (v >= 50) return "#f97316";
  return "#ef4444";
}

function genChartConfig(modules: ModuleCoverage[], tests: TestFileResult[]): string {
  const sorted = [...modules].sort((a, b) => b[1].totalStmts - a[1].totalStmts);
  const labels = JSON.stringify(sorted.map(m => m[0]));
  const stmtData = JSON.stringify(sorted.map(m => pctf(m[1].coveredStmts, m[1].totalStmts)));
  const branchData = JSON.stringify(sorted.map(m => pctf(m[1].coveredBranches, m[1].totalBranches)));
  const funcData = JSON.stringify(sorted.map(m => pctf(m[1].coveredFuncs, m[1].totalFuncs)));
  const healthData = JSON.stringify(sorted.map(m => computeHealth(m[1])));
  const testCounts = JSON.stringify(sorted.map(m => {
    const modTests = tests.filter(t => t.module === m[0]);
    return modTests.reduce((a, t) => a + t.tests, 0);
  }));
  const colors = JSON.stringify(sorted.map(m => coverageColor(pctf(m[1].coveredStmts, m[1].totalStmts))));
  const modLabels = JSON.stringify(sorted.map(m => m[0]));

  return `
    const modLabels = ${modLabels};
    const stmtCov = ${stmtData};
    const branchCov = ${branchData};
    const funcCov = ${funcData};
    const healthIdx = ${healthData};
    const testCounts = ${testCounts};
    const covColors = ${colors};
  `;
}

const NOW = new Date().toISOString().slice(0, 19).replace("T", " ");

function generateHtml(tests: { summary: any; files: TestFileResult[] }, modules: Map<string, ModuleCoverage>, totals: { stmts: number; branches: number; funcs: number }): string {
  const s = tests.summary;
  const passRate = s.totalTests > 0 ? ((s.passedTests / s.totalTests) * 100).toFixed(1) : "0";
  const sortedMods = [...modules.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  let totalLogicFiles = 0, totalLogicFullCov = 0;
  for (const [_, m] of sortedMods) { totalLogicFiles += m.logicFiles; totalLogicFullCov += m.logicCovered; }

  const avgHealth = sortedMods.reduce((a, [_, m]) => a + computeHealth(m), 0) / Math.max(sortedMods.length, 1);
  const qgPass = sortedMods.filter(([_, m]) => pctf(m.coveredStmts, m.totalStmts) >= 80).length;
  const qgFail = sortedMods.length - qgPass;

  let moduleRows = "";
  let riskRows = "";
  for (const [key, mod] of sortedMods) {
    const stmtP = pctf(mod.coveredStmts, mod.totalStmts);
    const brP = pctf(mod.coveredBranches, mod.totalBranches);
    const fnP = pctf(mod.coveredFuncs, mod.totalFuncs);
    const health = computeHealth(mod);
    const tFiles = mod.files.length;
    const fullCovFiles = mod.files.filter(f => f.stmts === 100).length;
    const modTests = tests.files.filter(t => t.module === key);
    const tCount = modTests.reduce((a, t) => a + t.tests, 0);
    const healthColor = health >= 80 ? "#22c55e" : health >= 60 ? "#eab308" : health >= 40 ? "#f97316" : "#ef4444";
    const qg = stmtP >= 80 ? "<span style='color:#22c55e'>✓</span>" : "<span style='color:#ef4444'>✗</span>";

    moduleRows += `
    <tr>
      <td><strong>${key}</strong> ${qg}</td>
      <td>${tFiles}</td>
      <td>${fullCovFiles}/${tFiles}</td>
      <td>${tCount}</td>
      <td><div class="bar"><div class="bar-fill" style="width:${Math.min(stmtP,100)}%;background:${coverageColor(stmtP)}"></div><span>${stmtP}%</span></div></td>
      <td><div class="bar"><div class="bar-fill" style="width:${Math.min(brP,100)}%;background:${coverageColor(brP)}"></div><span>${brP}%</span></div></td>
      <td>${fnP}%</td>
      <td><span style="color:${healthColor};font-weight:700">${health}</span></td>
    </tr>`;

    if (stmtP < 80) {
      riskRows += `<tr><td>${key}</td><td>${stmtP}%</td><td>${brP}%</td><td>${tCount} tests</td><td>${healthColor === "#ef4444" ? "🔴 High" : healthColor === "#f97316" ? "🟡 Medium" : "⚠️ Low"}</td></tr>`;
    }
  }

  let distBuckets = { "100%": 0, "80-99%": 0, "50-79%": 0, "<50%": 0 };
  for (const [_, mod] of sortedMods) {
    for (const f of mod.files) {
      if (f.stmts === 100) distBuckets["100%"]++;
      else if (f.stmts >= 80) distBuckets["80-99%"]++;
      else if (f.stmts >= 50) distBuckets["50-79%"]++;
      else distBuckets["<50%"]++;
    }
  }

  let testRows = "";
  for (const f of tests.files.sort((a, b) => a.name.localeCompare(b.name))) {
    const d = f.durationMs >= 1000 ? `${(f.durationMs / 1000).toFixed(1)}s` : `${f.durationMs}ms`;
    testRows += `<tr>
      <td class="file-cell"><span class="mb mb-${f.module}">${f.module}</span> ${f.name.replace(/^src\//, "")}</td>
      <td>${f.tests}</td>
      <td>${f.passed}</td>
      <td>${f.failed > 0 ? `<span class="fail">${f.failed}</span>` : f.failed}</td>
      <td>${d}</td>
    </tr>`;
  }

  const CHART_JS = "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QA Analytics Dashboard</title>
<script src="${CHART_JS}"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1121; color: #e2e8f0; padding: 2rem; }
  h1 { font-size: 1.65rem; font-weight: 700; letter-spacing: -.02em; }
  h1 small { font-size: .8rem; font-weight: 400; color: #64748b; margin-left: .75rem; }
  .subtitle { color: #64748b; font-size: .8rem; margin: .25rem 0 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .875rem; margin-bottom: 2rem; }
  .card { background: linear-gradient(135deg, #1a2332 0%, #151e2c 100%); border-radius: 1rem; padding: 1.25rem 1.5rem; border: 1px solid #1e2d45; position: relative; overflow: hidden; }
  .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 1rem 1rem 0 0; }
  .card.green::before { background: #22c55e; }
  .card.red::before { background: #ef4444; }
  .card.yellow::before { background: #eab308; }
  .card.blue::before { background: #3b82f6; }
  .card.purple::before { background: #8b5cf6; }
  .card .val { font-size: 2rem; font-weight: 800; line-height: 1.2; letter-spacing: -.02em; }
  .card .lbl { font-size: .7rem; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin-top: .2rem; }
  .card .sub { font-size: .7rem; color: #475569; margin-top: .15rem; }
  .card.green .val { color: #22c55e; }
  .card.red .val { color: #ef4444; }
  .card.yellow .val { color: #eab308; }
  .card.blue .val { color: #3b82f6; }
  .card.purple .val { color: #a78bfa; }

  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
  .chart-card { background: #1a2332; border-radius: 1rem; padding: 1.25rem; border: 1px solid #1e2d45; }
  .chart-card h3 { font-size: .85rem; font-weight: 600; color: #94a3b8; margin-bottom: .75rem; text-transform: uppercase; letter-spacing: .04em; }
  .chart-card .chart-wrap { position: relative; height: 220px; }
  .chart-card .chart-wrap.tall { height: 300px; }
  .chart-card.full { grid-column: 1 / -1; }
  .chart-card.full .chart-wrap { height: 260px; }

  @media (max-width: 900px) { .chart-grid { grid-template-columns: 1fr; } }

  h2 { font-size: 1rem; font-weight: 700; margin: 2rem 0 1rem; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; }
  table { width: 100%; border-collapse: collapse; background: #1a2332; border-radius: .75rem; overflow: hidden; border: 1px solid #1e2d45; margin-bottom: 2rem; }
  th, td { padding: .65rem 1rem; text-align: left; font-size: .8rem; }
  th { background: #1e2d45; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .05em; font-size: .65rem; }
  tr:not(:last-child) td { border-bottom: 1px solid #1a2538; }
  tr:hover td { background: #1e2f4a; }
  .bar { display: flex; align-items: center; gap: .5rem; min-width: 100px; }
  .bar-fill { height: 7px; border-radius: 4px; min-width: 3px; flex-shrink: 0; transition: width .6s ease; }
  .bar span { font-size: .7rem; font-weight: 600; white-space: nowrap; }

  .mb { display: inline-block; padding: .1rem .45rem; border-radius: 3px; font-size: .6rem; font-weight: 700; text-transform: uppercase; margin-right: .45rem; vertical-align: middle; letter-spacing: .03em; }
  .mb-auth { background: #7c3aed33; color: #a78bfa; }
  .mb-business-partner { background: #0891b233; color: #22d3ee; }
  .mb-inventory { background: #05966933; color: #34d399; }
  .mb-orders { background: #d9770633; color: #fbbf24; }
  .mb-products { background: #dc262633; color: #f87171; }
  .mb-transactions { background: #8b5cf633; color: #c084fc; }
  .mb-core { background: #47556933; color: #94a3b8; }

  .fail { color: #ef4444; font-weight: 700; }
  .file-cell { max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tag { display: inline-block; padding: .1rem .5rem; border-radius: 999px; font-size: .6rem; font-weight: 600; }
  .tag-green { background: #22c55e22; color: #22c55e; }
  .tag-red { background: #ef444422; color: #ef4444; }
  .tag-yellow { background: #eab30822; color: #eab308; }
  .footer { text-align: center; color: #334155; font-size: .7rem; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #1e2d45; }
</style>
</head>
<body>

<h1>QA Analytics Dashboard <small>v1.0</small></h1>
<p class="subtitle">${NOW} &nbsp;·&nbsp; feature/qa-dashboard &nbsp;·&nbsp; ${s.totalTests} tests · ${totals.stmts}% cov</p>

<div class="grid">
  <div class="card green">
    <div class="val">${s.passedTests}/${s.totalTests}</div>
    <div class="lbl">Tests Passed</div>
    <div class="sub">${passRate}% pass rate</div>
  </div>
  <div class="card ${s.failedTests > 0 ? 'red' : 'green'}">
    <div class="val">${s.failedTests}</div>
    <div class="lbl">Failures</div>
    <div class="sub">${s.failedSuites} failing suites</div>
  </div>
  <div class="card blue">
    <div class="val">${totals.stmts}%</div>
    <div class="lbl">Line Coverage</div>
    <div class="sub">${totals.branches}% branches · ${totals.funcs}% functions</div>
  </div>
  <div class="card purple">
    <div class="val">${Math.round(avgHealth)}</div>
    <div class="lbl">Avg Module Health</div>
    <div class="sub">weighted score</div>
  </div>
  <div class="card ${qgFail === 0 ? 'green' : 'red'}">
    <div class="val">${qgPass}/${sortedMods.length}</div>
    <div class="lbl">Quality Gates</div>
    <div class="sub">${qgFail === 0 ? 'all passing' : qgFail + ' failing'}</div>
  </div>
  <div class="card blue">
    <div class="val">${totalLogicFullCov}/${totalLogicFiles}</div>
    <div class="lbl">Logic Files 100%</div>
    <div class="sub">use-cases · validators · middleware</div>
  </div>
</div>

<div class="chart-grid">
  <div class="chart-card">
    <h3>Coverage by Module</h3>
    <div class="chart-wrap"><canvas id="chartCoverage"></canvas></div>
  </div>
  <div class="chart-card">
    <h3>Module Health Index</h3>
    <div class="chart-wrap"><canvas id="chartHealth"></canvas></div>
  </div>
  <div class="chart-card">
    <h3>Coverage Distribution</h3>
    <div class="chart-wrap"><canvas id="chartDist"></canvas></div>
  </div>
  <div class="chart-card">
    <h3>Tests per Module</h3>
    <div class="chart-wrap"><canvas id="chartTests"></canvas></div>
  </div>
</div>

${riskRows ? `<h2>⚠️ Risk Assessment</h2>
<table><thead><tr><th>Module</th><th>Coverage</th><th>Branches</th><th>Tests</th><th>Risk</th></tr></thead><tbody>${riskRows}</tbody></table>` : ""}

<h2>Coverage by Module</h2>
<table>
  <thead><tr><th>Module</th><th>Files</th><th>100%</th><th>Tests</th><th>Statements</th><th>Branches</th><th>Functions</th><th>Health</th></tr></thead>
  <tbody>${moduleRows}</tbody>
</table>

<h2>Test Files</h2>
<table>
  <thead><tr><th>File</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Duration</th></tr></thead>
  <tbody>${testRows}</tbody>
</table>

<div class="footer">Generated by scripts/generateQaDashboard.ts &nbsp;·&nbsp; Chart.js ${CHART_JS}</div>

<script>
${genChartConfig(sortedMods, tests.files)}

const stmtColor = stmtCov.map(v => v >= 90 ? '#22c55e' : v >= 75 ? '#eab308' : v >= 50 ? '#f97316' : '#ef4444');

new Chart(document.getElementById('chartCoverage'), {
  type: 'bar',
  data: {
    labels: modLabels,
    datasets: [
      { label: 'Statements', data: stmtCov, backgroundColor: stmtColor, borderRadius: 4, borderSkipped: false },
      { label: 'Branches', data: branchCov, backgroundColor: '#3b82f6', borderRadius: 4, borderSkipped: false },
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e2d45' } },
      y: { min: 0, max: 100, ticks: { color: '#64748b', font: { size: 10 }, callback: v => v + '%' }, grid: { color: '#1e2d45' } }
    }
  }
});

new Chart(document.getElementById('chartHealth'), {
  type: 'radar',
  data: {
    labels: modLabels,
    datasets: [{
      label: 'Health Index', data: healthIdx,
      backgroundColor: '#3b82f622', borderColor: '#3b82f6', borderWidth: 2,
      pointBackgroundColor: healthIdx.map(v => v >= 80 ? '#22c55e' : v >= 60 ? '#eab308' : '#ef4444'),
      pointRadius: 5, pointHoverRadius: 7
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { color: '#64748b', backdropColor: 'transparent', font: { size: 9 } },
        grid: { color: '#1e2d45' },
        pointLabels: { color: '#94a3b8', font: { size: 10 } }
      }
    }
  }
});

new Chart(document.getElementById('chartDist'), {
  type: 'doughnut',
  data: {
    labels: ['100%', '80-99%', '50-79%', '<50%'],
    datasets: [{
      data: [${distBuckets["100%"]}, ${distBuckets["80-99%"]}, ${distBuckets["50-79%"]}, ${distBuckets["<50%"]}],
      backgroundColor: ['#22c55e', '#3b82f6', '#f97316', '#ef4444'],
      borderWidth: 0
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, padding: 12 } }
    }
  }
});

new Chart(document.getElementById('chartTests'), {
  type: 'bar',
  data: {
    labels: modLabels,
    datasets: [
      { label: 'Tests', data: testCounts, backgroundColor: stmtColor, borderRadius: 4, borderSkipped: false }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e2d45' } },
      y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e2d45' } }
    }
  }
});
</script>
</body>
</html>`;
}

function main() {
  console.log("Loading coverage data...");
  const { modules, totals } = loadCoverage();
  console.log(`  ${modules.size} modules, ${totals.stmts}% overall coverage`);

  console.log("Loading test results...");
  const tests = loadTestResults();
  console.log(`  ${tests.summary.totalTests} tests, ${tests.summary.totalSuites} suites`);

  const outDir = join(ROOT, "qa-dashboard");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const html = generateHtml(tests, modules, totals);
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  console.log("Dashboard generated: qa-dashboard/index.html");
}

main();
