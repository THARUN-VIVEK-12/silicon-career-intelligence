const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SOURCES = JSON.parse(process.env.SOURCES_JSON || '[]');
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.text();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}
function classify(title, description='') {
  const text = `${title} ${description}`.toLowerCase();
  const rules = [
    ['Physical Design', /physical design|place.?and.?route|floorplan|clock tree|cts engineer/],
    ['RTL Design', /rtl design|logic design|verilog design|digital design engineer/],
    ['Design Verification', /design verification|verification engineer|uvm|systemverilog/],
    ['STA', /static timing|timing analysis|sta engineer/],
    ['DFT', /design for test|\bdft\b|scan insertion|atpg/],
    ['Analog / Mixed Signal', /analog|mixed.signal|custom ic|circuit design/],
    ['FPGA', /\bfpga\b|field programmable/],
    ['EDA & CAD', /eda engineer|cad engineer|eda software/],
    ['Process & Manufacturing', /process engineer|fab|fabrication|yield engineer|manufacturing/],
    ['Silicon Validation', /silicon validation|post.silicon|validation engineer/],
    ['Embedded Systems', /embedded|firmware/],
  ];
  return rules.find(([, re]) => re.test(text))?.[0] || 'Semiconductor';
}
function experience(title, description='') {
  const t = `${title} ${description}`.toLowerCase();
  if (/intern(ship)?|student program/.test(t)) return 'Internship';
  if (/new grad|graduate|entry.level|early career|fresher|university graduate/.test(t)) return 'Entry-level';
  if (/senior|staff|principal|lead/.test(t)) return 'Experienced';
  return 'Experienced';
}
function employment(title) { return /intern(ship)?/i.test(title) ? 'Internship' : /contract|temporary/i.test(title) ? 'Contract' : 'Full-time'; }
function shaLike(input) { // stable non-cryptographic content fingerprint for change detection
  let h = 2166136261;
  for (let i=0; i<input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
function normalizeGreenhouse(job, source) {
  const loc = job.location?.name || '';
  const desc = (job.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { external_job_id:String(job.id), title:job.title, company:source.company, location:loc, country:/india|bengaluru|bangalore|hyderabad|chennai|pune|noida|gurugram/i.test(loc)?'India':'Global', category:classify(job.title,desc), experience_level:experience(job.title,desc), employment_type:employment(job.title), description:desc.slice(0,12000), application_url:job.absolute_url, source_url:job.absolute_url, source_published_at:job.updated_at || null };
}
function normalizeLever(job, source) {
  const loc = (job.categories?.location || job.categories?.allLocations || '').toString();
  const desc = `${job.descriptionPlain || ''} ${job.additionalPlain || ''}`.trim();
  return { external_job_id:String(job.id), title:job.text, company:source.company, location:loc, country:/india|bengaluru|bangalore|hyderabad|chennai|pune|noida|gurugram/i.test(loc)?'India':'Global', category:classify(job.text,desc), experience_level:experience(job.text,desc), employment_type:employment(job.text), description:desc.slice(0,12000), application_url:job.hostedUrl || job.applyUrl, source_url:job.hostedUrl || job.applyUrl, source_published_at:job.createdAt ? new Date(job.createdAt).toISOString() : null };
}
async function fetchSource(source) {
  if (source.type === 'greenhouse') {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.token)}/jobs?content=true`);
    if (!res.ok) throw new Error(`Greenhouse returned ${res.status}`);
    const data = await res.json();
    return (data.jobs || []).map(j => normalizeGreenhouse(j, source));
  }
  if (source.type === 'lever') {
    const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(source.token)}?mode=json`);
    if (!res.ok) throw new Error(`Lever returned ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Lever response was not an array');
    return data.map(j => normalizeLever(j, source));
  }
  throw new Error(`Unsupported adapter '${source.type}'. Only public Greenhouse and Lever job feeds are implemented.`);
}
async function runSource(source) {
  const run = await db('collection_runs', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify({source_name:source.company || source.token || source.type, status:'running'}) });
  const runId = run?.[0]?.id;
  try {
    const jobs = await fetchSource(source);
    const sourceUrl = source.source_url || (source.type==='greenhouse' ? `https://boards.greenhouse.io/${source.token}` : `https://jobs.lever.co/${source.token}`);
    const sourceRows = await db('sources?on_conflict=source_type,source_url', { method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=representation'}, body:JSON.stringify({name:source.company,source_type:source.type,source_url:sourceUrl,adapter:source.type,external_key:source.token,enabled:true,history_policy:'all'}) });
    let sourceId = sourceRows?.[0]?.id;
    if (!sourceId) {
      const found = await db(`sources?source_type=eq.${encodeURIComponent(source.type)}&source_url=eq.${encodeURIComponent(sourceUrl)}&select=id`);
      sourceId = found?.[0]?.id;
    }
    if (!sourceId) throw new Error('Could not resolve source ID');
    const seenIds = new Set();
    let inserted = 0;
    for (const job of jobs) {
      if (!job.external_job_id || !job.title || !job.application_url) continue;
      seenIds.add(job.external_job_id);
      const hash = shaLike([job.title,job.company,job.location,job.description,job.application_url].join('|'));
      const payload = { ...job, source_id:sourceId, source_name:source.company, last_seen_at:new Date().toISOString(), last_checked_at:new Date().toISOString(), missing_checks:0, content_hash:hash, status:'active' };
      await db('jobs?on_conflict=source_id,external_job_id', { method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify(payload) });
      inserted++;
    }
    // Only consider expiry when the source request succeeded and returned a complete list.
    const existing = await db(`jobs?source_id=eq.${sourceId}&status=in.(active,stale)&select=id,external_job_id,missing_checks`);
    for (const row of existing || []) {
      if (!row.external_job_id || seenIds.has(String(row.external_job_id))) continue;
      const missing = Number(row.missing_checks || 0) + 1;
      await db(`jobs?id=eq.${row.id}`, { method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({missing_checks:missing,status:missing>=2?'stale':'active',last_checked_at:new Date().toISOString()}) });
    }
    if (runId) await db(`collection_runs?id=eq.${runId}`, { method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({finished_at:new Date().toISOString(),status:'success',fetched_count:jobs.length,inserted_count:inserted}) });
    console.log(`[OK] ${source.company}: fetched ${jobs.length}, upserted ${inserted}`);
  } catch (err) {
    if (runId) await db(`collection_runs?id=eq.${runId}`, { method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({finished_at:new Date().toISOString(),status:'failed',error_message:String(err.message).slice(0,1000)}) }).catch(()=>{});
    console.error(`[FAIL] ${source.company || source.token}: ${err.message}`);
    throw err;
  }
}
if (!SOURCES.length) {
  console.log('No sources configured. Add public Greenhouse/Lever board identifiers to the SOURCES_JSON GitHub secret.');
} else {
  let failed = 0;
  for (const source of SOURCES) {
    try { await runSource(source); } catch { failed++; }
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  if (failed) process.exitCode = 1;
}
