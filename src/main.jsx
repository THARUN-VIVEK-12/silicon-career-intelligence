import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, ArrowDownRight, ArrowRight, Bookmark, BriefcaseBusiness, Building2, Check,
  ChevronDown, CircleHelp, Clock3, Cpu, ExternalLink, Filter, Globe2, GraduationCap,
  LayoutDashboard, Link2, ListFilter, MapPin, Menu, MessageCircle, Plus, RefreshCw,
  Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, X, Zap
} from 'lucide-react';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR_PROJECT')
  ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const CHANNELS = [
  { name: 'Semiconductor WhatsApp Channel 1', url: 'https://whatsapp.com/channel/0029VazxTWj9sBIHUOz1xe0N', mode: 'Existing posts may be imported manually; future updates can be submitted', history: 'Manual import allowed', status: 'Manual import' },
  { name: 'Semiconductor WhatsApp Channel 2', url: 'https://whatsapp.com/channel/0029Vb8Gem43GJP0iVuxMJ1e', mode: 'Future updates only; do not import historical posts', history: 'Future only', status: 'Future only' },
];
const COMPANY_SOURCES = [
  { name:'Qualcomm', url:'https://careers.qualcomm.com/', category:'Chip design' },
  { name:'NVIDIA', url:'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', category:'AI chips & GPU' },
  { name:'AMD', url:'https://careers.amd.com/', category:'CPU/GPU design' },
  { name:'Intel', url:'https://jobs.intel.com/', category:'Silicon engineering' },
  { name:'Synopsys', url:'https://careers.synopsys.com/', category:'EDA & IP' },
  { name:'Cadence', url:'https://www.cadence.com/en_US/home/company/careers.html', category:'EDA & design' },
  { name:'Texas Instruments', url:'https://careers.ti.com/', category:'Analog & embedded' },
  { name:'Micron', url:'https://micron.wd1.myworkdayjobs.com/External', category:'Memory & manufacturing' },
  { name:'Arm', url:'https://careers.arm.com/', category:'CPU architecture' },
  { name:'Marvell', url:'https://careers.marvell.com/', category:'Semiconductor design' },
  { name:'Naukri.com', url:'https://www.naukri.com/semiconductor-jobs', category:'External job search' },
  { name:'LinkedIn Jobs', url:'https://www.linkedin.com/jobs/search/?keywords=semiconductor', category:'External job search' },
];
const DEMO_JOBS = [
  { id:'demo-1', title:'Physical Design Engineer', company:'Example Semiconductor Co.', location:'Bengaluru, India', country:'India', category:'Physical Design', experience_level:'Experienced', employment_type:'Full-time', description:'DEMO LISTING — replace with a verified employer vacancy. Typical responsibilities may include floorplanning, placement, clock-tree synthesis, routing, timing closure and signoff.', application_url:'https://careers.qualcomm.com/', source_name:'Demonstration data', source_url:'https://careers.qualcomm.com/', source_published_at:null, status:'demo', skills:['ICC2','Innovus','STA'], created_at:new Date().toISOString() },
  { id:'demo-2', title:'RTL Design Verification Intern', company:'Example Silicon Labs', location:'Hyderabad, India', country:'India', category:'Design Verification', experience_level:'Internship', employment_type:'Internship', description:'DEMO LISTING — not a live vacancy. Example role highlighting SystemVerilog, UVM, testbench development and debugging.', application_url:'https://careers.synopsys.com/', source_name:'Demonstration data', source_url:'https://careers.synopsys.com/', source_published_at:null, status:'demo', skills:['SystemVerilog','UVM','Verilog'], created_at:new Date().toISOString() },
  { id:'demo-3', title:'Analog IC Design Engineer', company:'Example Microelectronics', location:'Noida, India', country:'India', category:'Analog / Mixed Signal', experience_level:'Experienced', employment_type:'Full-time', description:'DEMO LISTING — not a live vacancy. Example role covering analog circuit design, simulation, layout collaboration and verification.', application_url:'https://careers.ti.com/', source_name:'Demonstration data', source_url:'https://careers.ti.com/', source_published_at:null, status:'demo', skills:['Cadence Virtuoso','SPICE','Analog'], created_at:new Date().toISOString() },
  { id:'demo-4', title:'Semiconductor Process Engineer', company:'Example Global Foundry', location:'Global opportunities', country:'Global', category:'Process & Manufacturing', experience_level:'Entry-level', employment_type:'Full-time', description:'DEMO LISTING — not a live vacancy. Example semiconductor manufacturing role for process integration, yield improvement and process monitoring.', application_url:'https://jobs.intel.com/', source_name:'Demonstration data', source_url:'https://jobs.intel.com/', source_published_at:null, status:'demo', skills:['Process integration','Yield','SPC'], created_at:new Date().toISOString() },
];
const CATEGORIES = ['All categories','Physical Design','RTL Design','Design Verification','STA','DFT','Analog / Mixed Signal','FPGA','EDA & CAD','Process & Manufacturing','Silicon Validation','Embedded Systems'];
const EXPERIENCE = ['All experience','Fresher','Entry-level','Experienced','Internship'];

function timeAgo(value) {
  if (!value) return 'Date not provided';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Recently updated';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
function App() {
  const [page, setPage] = useState('jobs');
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [dataMode, setDataMode] = useState(supabase ? 'connecting' : 'demo');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [experience, setExperience] = useState('All experience');
  const [location, setLocation] = useState('India first');
  const [sort, setSort] = useState('recent');
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('sci_saved_jobs') || '[]'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title:'', company:'', location:'', category:'Physical Design', experience_level:'Fresher', employment_type:'Full-time', application_url:'', source_url:'', description:'' });
  const [submitMessage, setSubmitMessage] = useState('');

  async function loadJobs() {
    if (!supabase) { setJobs(DEMO_JOBS); setDataMode('demo'); return; }
    setDataMode('connecting');
    const { data, error } = await supabase.from('jobs').select('*').eq('status','active').order('last_seen_at',{ascending:false}).limit(500);
    if (error) { console.error(error); setJobs(DEMO_JOBS); setDataMode('error'); }
    else { setJobs(data || []); setDataMode('live'); }
  }
  useEffect(() => { loadJobs(); }, []);
  useEffect(() => { localStorage.setItem('sci_saved_jobs', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer); }, [toast]);

  const filtered = useMemo(() => {
    let list = [...jobs];
    if (page === 'saved') list = list.filter(j => saved.includes(j.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(j => [j.title,j.company,j.location,j.category,j.description,(j.skills||[]).join(' ')].filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    if (category !== 'All categories') list = list.filter(j => (j.category||'').toLowerCase().includes(category.toLowerCase().replace(' / mixed signal','')) || (category==='EDA & CAD' && /eda|cad/i.test(j.category||'')));
    if (experience !== 'All experience') list = list.filter(j => (j.experience_level||'').toLowerCase() === experience.toLowerCase());
    if (location === 'India first') list.sort((a,b) => ((a.country||'').toLowerCase()==='india' ? -1:1) - ((b.country||'').toLowerCase()==='india' ? -1:1));
    if (sort === 'recent') list.sort((a,b) => new Date(b.last_seen_at || b.created_at || 0)-new Date(a.last_seen_at || a.created_at || 0));
    return list;
  }, [jobs, query, category, experience, location, sort, page, saved]);

  function toggleSaved(job) {
    setSaved(old => old.includes(job.id) ? old.filter(id => id !== job.id) : [...old, job.id]);
    setToast(saved.includes(job.id) ? 'Removed from saved jobs' : 'Job saved to this browser');
  }
  async function submitJob(e) {
    e.preventDefault(); setSubmitting(true); setSubmitMessage('');
    const payload = { ...form, source_name:'Community submission', status:'pending', country:/india|bengaluru|bangalore|hyderabad|chennai|pune|noida|gurugram|gurgaon/i.test(form.location) ? 'India' : 'Global' };
    if (supabase) {
      const { error } = await supabase.from('job_submissions').insert(payload);
      if (error) { setSubmitMessage(`Could not submit: ${error.message}. Check the Supabase SQL setup.`); setSubmitting(false); return; }
      setSubmitMessage('Submitted for review. It will not appear publicly until an administrator verifies it.');
    } else {
      const pending = JSON.parse(localStorage.getItem('sci_pending_submissions') || '[]');
      pending.push({ ...payload, id:`local-${Date.now()}`, submitted_at:new Date().toISOString() });
      localStorage.setItem('sci_pending_submissions', JSON.stringify(pending));
      setSubmitMessage('Saved in this browser as a demo submission. Connect Supabase to store it online for review.');
    }
    setForm({ title:'', company:'', location:'', category:'Physical Design', experience_level:'Fresher', employment_type:'Full-time', application_url:'', source_url:'', description:'' });
    setSubmitting(false);
  }

  const nav = [ {id:'jobs', label:'Find jobs', icon:Search}, {id:'saved',label:'Saved jobs',icon:Bookmark}, {id:'sources',label:'Sources',icon:Globe2}, {id:'submit',label:'Submit a job',icon:Plus} ];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><Cpu size={23}/></div><div><div className="brand-name">SILICON<span>CAREERS</span></div><div className="brand-sub">CAREER INTELLIGENCE</div></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setMobileOpen(false);}}><item.icon size={18}/><span>{item.label}</span>{item.id==='saved' && saved.length>0 && <span className="nav-count">{saved.length}</span>}</button>)}</nav>
      <div className="sidebar-divider"/><div className="workspace-label">QUICK CATEGORIES</div>
      <div className="quick-cats">{['Physical Design','RTL Design','Design Verification','STA','DFT','Analog / Mixed Signal'].map(c=><button key={c} onClick={()=>{setCategory(c);setPage('jobs');}}><span className="cat-dot"/>{c}</button>)}</div>
      <div className="sidebar-bottom"><div className="status-card"><div className="status-top"><span className={`status-dot ${dataMode==='live'?'green':dataMode==='error'?'red':'amber'}`}/><span>{dataMode==='live'?'Database connected':dataMode==='error'?'Database unavailable':dataMode==='connecting'?'Connecting database':'Demo mode'}</span></div><p>{dataMode==='live'?'Showing active records from Supabase.':'Connect Supabase to enable shared, persistent job data.'}</p><button onClick={loadJobs}><RefreshCw size={13}/> Refresh connection</button></div><div className="sidebar-foot"><ShieldCheck size={14}/> Source-linked listings. Apply at source.</div></div>
    </aside>
    {mobileOpen && <div className="mobile-scrim" onClick={()=>setMobileOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{nav.find(n=>n.id===page)?.label || 'Find jobs'}</strong></div><div className="top-actions"><span className="region-pill"><Globe2 size={14}/> India <ChevronDown size={13}/></span><span className="top-avatar">SC</span></div></header>
      <div className="content-wrap">
        {page==='jobs' && <>
          <section className="hero"><div className="hero-content"><div className="eyebrow"><span className="eyebrow-line"/> THE SEMICONDUCTOR TALENT NETWORK</div><h1>Find your next role<br/>in <span>silicon.</span></h1><p>One focused place for semiconductor, VLSI, chip design and fabrication opportunities — from early careers to experienced engineering roles.</p><div className="hero-stats"><div><strong>{dataMode==='live'?jobs.length:'—'}</strong><span>Active listings</span></div><div><strong>12+</strong><span>Career sources</span></div><div><strong>Global</strong><span>Coverage</span></div></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="chip-visual"><div className="chip-inner"><Cpu size={58} strokeWidth={1.15}/><span>Si</span></div></div><div className="floating-tag tag-one"><Activity size={14}/> Silicon careers</div><div className="floating-tag tag-two"><Zap size={14}/> Built for engineers</div><div className="circuit-line line-a"/><div className="circuit-line line-b"/></div></section>
          {dataMode==='demo' && <div className="notice demo-notice"><CircleHelp size={17}/><div><strong>Preview mode</strong><span>Example cards are clearly marked as demo data. Connect Supabase and the collector to display verified live vacancies.</span></div></div>}
          {dataMode==='error' && <div className="notice error-notice"><CircleHelp size={17}/><div><strong>Database could not be reached</strong><span>Showing demo cards. Check your Supabase URL, public key and SQL setup.</span></div></div>}
          <section className="search-panel"><div className="search-title"><div><span className="section-kicker">OPPORTUNITY FINDER</span><h2>Search semiconductor jobs</h2></div><button className="text-button" onClick={()=>{setQuery('');setCategory('All categories');setExperience('All experience');setLocation('India first');}}>Reset filters <X size={14}/></button></div><div className="search-row"><label className="search-box"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Job title, company, skill or keyword"/><kbd>⌕</kbd></label><button className="primary-btn search-btn" onClick={()=>document.querySelector('.job-list')?.scrollIntoView({behavior:'smooth'})}>Find jobs <ArrowRight size={16}/></button></div><div className="filter-row"><label className="filter-control"><MapPin size={15}/><select value={location} onChange={e=>setLocation(e.target.value)}><option>India first</option><option>All locations</option></select></label><label className="filter-control"><ListFilter size={15}/><select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label className="filter-control"><GraduationCap size={15}/><select value={experience} onChange={e=>setExperience(e.target.value)}>{EXPERIENCE.map(c=><option key={c}>{c}</option>)}</select></label><label className="filter-control"><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Recently updated</option><option value="company">Company</option></select></label></div></section>
          <section className="job-section job-list"><div className="list-heading"><div><span className="section-kicker">CURATED OPPORTUNITIES</span><h2>{page==='saved'?'Your saved jobs':'Latest semiconductor roles'} <span className="result-count">{filtered.length}</span></h2></div><div className="list-tools"><span className="source-legend"><span className="legend-dot"/> {dataMode==='live'?'Live database':'Preview cards'}</span><button className="refresh-btn" onClick={loadJobs}><RefreshCw size={15}/> Refresh</button></div></div>
            {filtered.length===0 ? <div className="empty-state"><div className="empty-icon"><Search size={24}/></div><h3>No matching jobs</h3><p>Try another keyword or broaden your filters. New sources can be added as they become available.</p><button className="secondary-btn" onClick={()=>{setQuery('');setCategory('All categories');setExperience('All experience');}}>Clear filters</button></div> : <div className="jobs-grid">{filtered.map(job=><article className="job-card" key={job.id}><div className="job-card-top"><div className="company-logo">{(job.company||'SC').split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</div><button className={`save-btn ${saved.includes(job.id)?'saved':''}`} aria-label="Save job" onClick={()=>toggleSaved(job)}><Bookmark size={17} fill={saved.includes(job.id)?'currentColor':'none'}/></button></div><div className="job-company">{job.company || 'Company not provided'} <span className="verified-mark" title="Source status depends on listing"><Check size={10}/></span></div><h3>{job.title}</h3><div className="job-meta"><span><MapPin size={14}/>{job.location||'Location not specified'}</span><span><BriefcaseBusiness size={14}/>{job.employment_type||'Not specified'}</span></div><div className="job-tags"><span>{job.category||'Semiconductor'}</span><span>{job.experience_level||'All levels'}</span></div><p className="job-description">{job.description || 'Open the original source to view the full job description and requirements.'}</p><div className="job-card-bottom"><div className="job-source"><span className={`source-dot ${job.status==='demo'?'demo-dot':''}`}/><div><strong>{job.source_name || 'Employer source'}</strong><small>{job.status==='demo'?'Demo only':`Checked ${timeAgo(job.last_seen_at||job.created_at)}`}</small></div></div><a className="apply-link" href={job.application_url||job.source_url||'#'} target="_blank" rel="noreferrer" onClick={e=>{if(!job.application_url&&!job.source_url)e.preventDefault();}}>{job.status==='demo'?'Example link':'Apply'} <ExternalLink size={14}/></a></div></article>)}</div>}
          </section>
          <section className="source-strip"><div className="source-strip-icon"><Globe2 size={21}/></div><div><strong>One search. Trusted destinations.</strong><p>Job details stay linked to their original source. Listings are only marked live after a source integration is configured.</p></div><button className="secondary-btn" onClick={()=>setPage('sources')}>Explore sources <ArrowRight size={15}/></button></section>
        </>}
        {page==='sources' && <section className="page-section"><div className="page-heading"><span className="section-kicker">SOURCE REGISTRY</span><h1>Where jobs come from</h1><p>Source links are ready to use. Automated collection is enabled only after an approved connector has been configured and tested.</p></div><div className="notice demo-notice"><ShieldCheck size={18}/><div><strong>Transparent by design</strong><span>External search links are not represented as imported job data. LinkedIn and Naukri require authorized data access for automated collection.</span></div></div><h2 className="subheading">Official and external job sources</h2><div className="source-grid">{COMPANY_SOURCES.map(s=><article className="source-card" key={s.name}><div className="source-card-icon"><Building2 size={20}/></div><div className="source-card-copy"><strong>{s.name}</strong><span>{s.category}</span><small><span className="status-dot amber"/> External link · integration not verified</small></div><a href={s.url} target="_blank" rel="noreferrer" aria-label={`Open ${s.name}`}><ExternalLink size={16}/></a></article>)}</div><h2 className="subheading">WhatsApp channel sources</h2><div className="channel-grid">{CHANNELS.map((c,i)=><article className="channel-card" key={c.url}><div className="channel-icon"><MessageCircle size={22}/></div><div className="channel-info"><span className="section-kicker">CHANNEL {String(i+1).padStart(2,'0')}</span><h3>{c.name}</h3><p>{c.mode}</p><div className="channel-rule"><ShieldCheck size={14}/>{c.history}</div><a href={c.url} target="_blank" rel="noreferrer">Open channel <ExternalLink size={13}/></a></div></article>)}</div><div className="info-panel"><CircleHelp size={18}/><div><strong>How WhatsApp imports work</strong><p>WhatsApp Channels do not expose a general public API for reading arbitrary channel histories. Use the submission/import workflow or a supported, authorized feed. Channel 2 is configured as future-only; historical posts must not be imported.</p></div></div></section>}
        {page==='saved' && <section className="page-section"><div className="page-heading"><span className="section-kicker">YOUR SHORTLIST</span><h1>Saved jobs</h1><p>Saved jobs are stored in this browser. Sign-in and cross-device syncing can be added after Supabase Auth is configured.</p></div><div className="jobs-grid">{filtered.map(job=><article className="job-card" key={job.id}><div className="job-card-top"><div className="company-logo">{(job.company||'SC').split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</div><button className="save-btn saved" onClick={()=>toggleSaved(job)}><Bookmark size={17} fill="currentColor"/></button></div><div className="job-company">{job.company}</div><h3>{job.title}</h3><div className="job-meta"><span><MapPin size={14}/>{job.location}</span></div><p className="job-description">{job.description}</p><div className="job-card-bottom"><span className="job-source"><strong>{job.source_name||'Source'}</strong></span><a className="apply-link" href={job.application_url||job.source_url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14}/></a></div></article>)}</div>{filtered.length===0&&<div className="empty-state"><div className="empty-icon"><Bookmark size={24}/></div><h3>No saved jobs yet</h3><p>Save a role from the job feed to keep it here.</p><button className="primary-btn" onClick={()=>setPage('jobs')}>Browse jobs <ArrowRight size={15}/></button></div>}</section>}
        {page==='submit' && <section className="page-section"><div className="page-heading"><span className="section-kicker">COMMUNITY SOURCING</span><h1>Submit a job opportunity</h1><p>Share a public job announcement from a company portal, LinkedIn, Naukri or a WhatsApp channel. Submissions remain pending until verified.</p></div><div className="submit-layout"><form className="submit-form" onSubmit={submitJob}><div className="form-grid"><label>Job title *<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. STA Engineer"/></label><label>Company *<input required value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Company name"/></label><label>Location *<input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Bengaluru, India"/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><label>Experience level<select value={form.experience_level} onChange={e=>setForm({...form,experience_level:e.target.value})}>{EXPERIENCE.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><label>Employment type<select value={form.employment_type} onChange={e=>setForm({...form,employment_type:e.target.value})}>{['Full-time','Internship','Contract','Part-time','Graduate program'].map(c=><option key={c}>{c}</option>)}</select></label><label className="full-field">Application URL *<input required type="url" value={form.application_url} onChange={e=>setForm({...form,application_url:e.target.value})} placeholder="https://company.com/careers/job-id"/></label><label className="full-field">Original post/source URL<input type="url" value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})} placeholder="LinkedIn, Naukri, WhatsApp or employer post URL"/></label><label className="full-field">Job details<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows="5" placeholder="Paste the announcement, required skills, deadline and any relevant details. Only submit content you are allowed to share."/></label></div><div className="form-note"><ShieldCheck size={16}/> Do not submit private messages or personal data. We only publish verified listings and permitted details.</div><button className="primary-btn" type="submit" disabled={submitting}>{submitting?'Submitting…':<>Submit for review <Send size={15}/></>}</button>{submitMessage&&<div className="submit-result"><Check size={17}/>{submitMessage}</div>}</form><aside className="submit-aside"><div className="aside-icon"><Sparkles size={24}/></div><h3>Help keep the feed useful</h3><p>Good submissions have a clear employer, role, location and direct application URL.</p><ul><li><Check size={15}/> Verify the job still exists</li><li><Check size={15}/> Include the official application link</li><li><Check size={15}/> Avoid duplicate submissions</li><li><Check size={15}/> Mark WhatsApp source clearly</li></ul><div className="aside-callout"><Clock3 size={16}/><span>Submissions are not automatically published. An administrator should verify them first.</span></div></aside></div></section>}
        <footer className="footer"><div>© {new Date().getFullYear()} Silicon Career Intelligence</div><div><span><ShieldCheck size={13}/> Source transparency</span><span><Zap size={13}/> Free-tier architecture</span></div></footer>
      </div>
    </main>
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
