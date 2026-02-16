import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-executive-accent selection:text-executive-dark">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-executive-dark flex items-center justify-center group-hover:bg-executive-accent transition-colors duration-500 shadow-lg shadow-executive-dark/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">AURUM <span className="text-executive-accent">INVENTORY</span></span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Link href="#features" className="hover:text-executive-dark transition-colors">Infrastructure</Link>
            <Link href="#analytics" className="hover:text-executive-dark transition-colors">Intelligence</Link>
            <Link href="#pricing" className="hover:text-executive-dark transition-colors">Economy</Link>
          </div>

          <div className="flex items-center gap-5">
            {session ? (
              <Link href="/dashboard" className="btn-executive-accent text-[10px] px-8 py-3 rounded-full uppercase tracking-widest font-black shadow-xl shadow-executive-accent/20">
                Command Center
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[10px] font-black text-slate-400 hover:text-executive-dark uppercase tracking-widest transition-colors">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-executive-dark text-[10px] px-8 py-3 rounded-full uppercase tracking-widest font-black shadow-xl shadow-executive-dark/20">
                  Join The Inner Circle
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        {/* Background Ambience */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-executive-accent/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-executive-dark text-executive-accent text-[9px] font-black uppercase tracking-[0.3em] mb-10 shadow-2xl">
                <span className="w-1.5 h-1.5 rounded-full bg-executive-accent animate-ping"></span>
                v4.0 Protocol Active
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black text-slate-900 leading-[0.9] tracking-tighter mb-10">
                Sovereign<br />
                <span className="text-executive-accent">Asset Control.</span>
              </h1>
              <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-xl font-medium">
                The definitive enterprise resource platform design for high-velocity distribution and intelligent logistics. Built for the modern executive who demands surgical precision.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <Link href="/signup" className="btn-executive-accent text-xs py-5 px-12 rounded-2xl shadow-2xl shadow-executive-accent/30 font-black uppercase tracking-widest hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
                  Deploy Protocol
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="ml-2"><path d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="#demo" className="btn-executive text-xs py-5 px-12 rounded-2xl border-slate-200 font-black uppercase tracking-widest hover:bg-slate-50 transition-all duration-300">
                  Request Dossier
                </Link>
              </div>

              <div className="mt-16 flex items-center gap-8 border-l-2 border-slate-100 pl-8">
                <div>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">$2.4B+</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assets Managed</p>
                </div>
                <div className="w-[1px] h-10 bg-slate-100"></div>
                <div>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">99.99%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Uptime SLA</p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-10 bg-executive-accent/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative bg-slate-100 p-3 rounded-[40px] shadow-2xl shadow-slate-900/10 transform rotate-2 hover:rotate-0 transition-all duration-700 ease-out border border-slate-200/50">
                <Image
                  src="/hero_interface_aurum.png"
                  alt="Aurum Interface"
                  width={1280}
                  height={800}
                  priority
                  className="relative rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-white/20"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Infrastructure */}
      <section id="features" className="py-40 bg-executive-dark text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-executive-accent/5 blur-[150px] rounded-full"></div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-20 bg-executive-accent/10 blur-[120px] rounded-full"></div>
              <Image
                src="/supply_chain_optimization.png"
                alt="Supply Chain"
                width={800}
                height={600}
                className="relative rounded-[48px] shadow-2xl border border-slate-100 grayscale hover:grayscale-0 transition-all duration-1000"
              />
            </div>
            <div className="order-1 lg:order-2 space-y-12">
              <div className="space-y-6">
                <p className="text-executive-accent text-[10px] font-black uppercase tracking-[0.4em]">Infrastructure</p>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tighter leading-tight">Global Mesh<br />Network.</h2>
                <p className="text-xl text-slate-400 leading-relaxed font-medium">
                  Synchronize your entire operation across continents. Our mesh protocol ensures sub-second latency for inventory updates, whether in the warehouse or the boardroom.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-executive-accent border border-white/10">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <h4 className="text-lg font-bold">Edge Distribution</h4>
                  <p className="text-sm text-slate-500 font-medium">Manage thousands of physical nodes with automated routing and regional balancing.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-executive-accent border border-white/10">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  </div>
                  <h4 className="text-lg font-bold">Liquid Logistics</h4>
                  <p className="text-sm text-slate-500 font-medium">Automated inter-location transfers with intelligent stock optimization algorithms.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence Section */}
      <section id="analytics" className="py-40 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-12">
              <div className="space-y-6">
                <p className="text-executive-accent text-[10px] font-black uppercase tracking-[0.4em]">Intelligence</p>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tighter leading-tight text-slate-900">Cognitive<br />Ledger.</h2>
                <p className="text-xl text-slate-500 leading-relaxed font-medium">
                  Traditional reporting is reactive. Aurum is predictive. Our cognitive ledger analyzes throughput patterns to forecast demand and eliminate stock-outs before they happen.
                </p>
              </div>
              <div className="space-y-8">
                {[
                  { title: "Revenue Velocity Tracking", desc: "Real-time monitoring of capital flow and asset yield." },
                  { title: "Predictive Procurement", desc: "Automated replenishment based on seasonal trend analysis." },
                  { title: "Fiscal Audit Integrity", desc: "Impeccable financial tracking with deep transaction dossiers." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-executive-accent flex items-center justify-center text-executive-accent font-black text-xs group-hover:bg-executive-accent group-hover:text-white transition-all duration-300">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-20 bg-slate-100 blur-[130px] rounded-full"></div>
              <Image
                src="/data_analytics_intelligence.png"
                alt="Intelligence Hub"
                width={800}
                height={600}
                className="relative rounded-[48px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-40 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <p className="text-executive-accent text-[10px] font-black uppercase tracking-[0.4em] mb-6">Investment Structure</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-slate-900 tracking-tighter">Value Proposition.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Standard Plan */}
            <div className="p-12 rounded-[40px] bg-white border border-slate-200 flex flex-col hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Essential</h3>
              <p className="text-slate-500 mb-10 text-sm font-medium">Core protocol for emerging units.</p>
              <div className="mb-12">
                <span className="text-6xl font-black text-slate-900">GHS 29</span>
                <span className="text-slate-400 text-sm font-bold ml-2">/ CYCLE</span>
              </div>
              <ul className="space-y-6 mb-12 flex-1">
                {['500 Managed Assets', 'Dual Node Access', 'Fiscal Reporting', 'Encrypted Transport'].map(feature => (
                  <li key={feature} className="flex items-center gap-4 text-sm text-slate-600 font-bold tracking-tight">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#C5A059" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-executive text-[10px] font-black uppercase tracking-widest py-5 rounded-2xl bg-slate-50 border-slate-100">
                Initialize Beta
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="p-12 rounded-[40px] bg-executive-dark text-white flex flex-col relative overflow-hidden shadow-2xl scale-105">
              <div className="absolute top-0 right-0 px-6 py-2 bg-executive-accent text-[9px] font-black uppercase tracking-widest text-executive-dark rounded-bl-3xl">
                Elite Protocol
              </div>
              <h3 className="text-2xl font-black mb-2">Professional</h3>
              <p className="text-slate-400 mb-10 text-sm font-medium">For high-throughput enterprises.</p>
              <div className="mb-12">
                <span className="text-6xl font-black text-executive-accent">GHS 89</span>
                <span className="text-slate-500 text-sm font-bold ml-2">/ CYCLE</span>
              </div>
              <ul className="space-y-6 mb-12 flex-1">
                {['Unlimited Managed Assets', '10 Active Nodes', 'Cognitive Forecasting', 'Priority Mesh Access', 'API Tier 1 Integration'].map(feature => (
                  <li key={feature} className="flex items-center gap-4 text-sm text-slate-300 font-bold tracking-tight">
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#C5A059" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-executive-accent text-[10px] font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-executive-accent/20">
                Enforce Growth
              </Link>
            </div>

            {/* Custom Plan */}
            <div className="p-12 rounded-[40px] bg-white border border-slate-200 flex flex-col hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Industrial</h3>
              <p className="text-slate-500 mb-10 text-sm font-medium">Bespoke infrastructure solutions.</p>
              <div className="mb-12">
                <span className="text-4xl font-black text-slate-900 uppercase">Consulting</span>
              </div>
              <ul className="space-y-6 mb-12 flex-1">
                {['Global Mesh Sync', 'Custom Core Bridges', 'Dedicated Strategist', 'Air-Gapped Options'].map(feature => (
                  <li key={feature} className="flex items-center gap-4 text-sm text-slate-600 font-bold tracking-tight">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#C5A059" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="btn-executive text-[10px] font-black uppercase tracking-widest py-5 rounded-2xl bg-slate-50 border-slate-100">
                Schedule Summit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Grid */}
      <section className="py-32 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mb-16">Global Syndicate of Trust</p>
          <div className="w-full flex flex-wrap justify-between items-center gap-16 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
            {['LOGISTICS', 'RETAIL PRO', 'SUPPLY.IO', 'AGRO GLOBAL', 'NEXUS', 'QUANTUM'].map(brand => (
              <span key={brand} className="text-3xl font-black text-slate-900 tracking-tighter">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Terminal CTA */}
      <section className="py-40 bg-executive-dark text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-executive-accent opacity-[0.03] transform skew-x-12 translate-x-20"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black mb-10 tracking-tighter leading-tight">Secure Your<br /><span className="text-executive-accent">Commercial Legacy.</span></h2>
          <p className="text-slate-400 text-xl mb-16 leading-relaxed font-medium">
            The decision of a moment determines the trajectory of a decade. Deploy Aurum protocol today. No frictional commitments required.
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center">
            <Link href="/signup" className="btn-executive-accent text-[10px] font-black uppercase tracking-widest py-6 px-16 rounded-2xl shadow-2xl shadow-executive-accent/20">
              Initialize Account
            </Link>
            <Link href="/contact" className="px-16 py-6 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
              Request Advisory
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-20">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-executive-dark flex items-center justify-center shadow-lg shadow-executive-dark/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
              </div>
              <span className="font-black text-2xl tracking-tighter text-slate-900">AURUM</span>
            </div>
            <p className="text-slate-500 max-w-sm mb-10 font-medium leading-relaxed italic">
              &quot;Precision is not just a metric, it is a statement of intent.&quot;
            </p>
            <div className="flex gap-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-executive-accent/10 hover:text-executive-accent transition-all duration-300 border border-slate-100" />)}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-10">Infrastructure</h4>
            <ul className="space-y-6 text-xs text-slate-500 font-bold uppercase tracking-tighter">
              <li><Link href="#features" className="hover:text-executive-accent transition-colors">Mesh Network</Link></li>
              <li><Link href="#solutions" className="hover:text-executive-accent transition-colors">Node Clusters</Link></li>
              <li><Link href="#integrations" className="hover:text-executive-accent transition-colors">Core Bridges</Link></li>
              <li><Link href="#pricing" className="hover:text-executive-accent transition-colors">Investment</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-10">Advisory</h4>
            <ul className="space-y-6 text-xs text-slate-500 font-bold uppercase tracking-tighter">
              <li><Link href="/docs" className="hover:text-executive-accent transition-colors">Manuals</Link></li>
              <li><Link href="/guides" className="hover:text-executive-accent transition-colors">Strategic Ops</Link></li>
              <li><Link href="/api" className="hover:text-executive-accent transition-colors">Terminal API</Link></li>
              <li><Link href="/help" className="hover:text-executive-accent transition-colors">Operations Hub</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-10">Syndicate</h4>
            <ul className="space-y-6 text-xs text-slate-500 font-bold uppercase tracking-tighter">
              <li><Link href="/about" className="hover:text-executive-accent transition-colors">Our Ethos</Link></li>
              <li><Link href="/careers" className="hover:text-executive-accent transition-colors">Human Assets</Link></li>
              <li><Link href="/blog" className="hover:text-executive-accent transition-colors">Intel Feed</Link></li>
              <li><Link href="/legal" className="hover:text-executive-accent transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-32 pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">© 2026 AURUM EXECUTIVE SYSTEMS. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-10 text-[9px] font-black text-slate-300 uppercase tracking-widest">
            <Link href="/privacy" className="hover:text-executive-accent transition-colors">Privacy Tier</Link>
            <Link href="/terms" className="hover:text-executive-accent transition-colors">Usage Terms</Link>
            <Link href="/cookies" className="hover:text-executive-accent transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
