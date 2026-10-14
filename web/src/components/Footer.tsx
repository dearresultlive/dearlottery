import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-900 mt-20 pt-12 pb-8 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-900">
          
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-base shadow-md">
                ₹
              </div>
              <div>
                <span className="font-black text-base text-white tracking-wide">DEAR RESULT LIVE</span>
                <span className="block text-[10px] text-amber-400 font-medium">ডিয়ার লটারি রেজাল্ট লাইভ পোর্টাল</span>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-md text-xs">
              Dear Result Live (<strong>dearresultlive.in</strong>) is a fast, trusted, independent public utility portal for checking official Nagaland, Sikkim, and West Bengal Dear State Lottery results. We publish winning numbers accurately for all daily 1:00 PM (দুপুর), 6:00 PM (সন্ধ্যা), and 8:00 PM (রাত) draws.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-xs flex items-center gap-1.5">
              <span>📅</span>
              <span>Daily Draws / দৈনিক ড্র</span>
            </h4>
            <ul className="space-y-2">
              <li><a href="/results/2026-10-14/1pm" className="hover:text-amber-400 transition-colors">1:00 PM Morning (দুপুর ১টা)</a></li>
              <li><a href="/results/2026-10-14/6pm" className="hover:text-amber-400 transition-colors">6:00 PM Day (সন্ধ্যা ৬টা)</a></li>
              <li><a href="/results/2026-10-14/8pm" className="hover:text-amber-400 transition-colors">8:00 PM Night (রাত ৮টা)</a></li>
              <li><a href="/checker" className="hover:text-amber-400 transition-colors">Instant Ticket Checker (টিকিট চেক)</a></li>
              <li><a href="/analytics" className="hover:text-amber-400 transition-colors">Hot & Cold Numbers (নম্বর অ্যানালিটিক্স)</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-xs flex items-center gap-1.5">
              <span>⚖️</span>
              <span>Trust & Legal / নিয়মাবলী</span>
            </h4>
            <ul className="space-y-2">
              <li><a href="/about" className="hover:text-amber-400 transition-colors">About Us (আমাদের সম্পর্কে)</a></li>
              <li><a href="/contact" className="hover:text-amber-400 transition-colors">Contact Us (যোগাযোগ)</a></li>
              <li><a href="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy Policy (গোপনীয়তা নীতি)</a></li>
              <li><a href="/terms" className="hover:text-amber-400 transition-colors">Terms of Service (ব্যবহারের শর্তাবলী)</a></li>
              <li><a href="/disclaimer" className="hover:text-amber-400 transition-colors">Official Disclaimer (দাবি পরিত্যাগ)</a></li>
            </ul>
          </div>

        </div>

        {/* Legal & Regulatory Disclaimer */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 mb-6 leading-relaxed text-[11px] text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-xs">
            <span>🛡️</span>
            <span>Independent 3rd-Party & Legal Advisory (স্বতন্ত্র ও আইনি বিজ্ঞপ্তি)</span>
          </div>
          <p>
            <strong className="text-white">Independent 3rd-Party Status:</strong> This website is an independent information service and data publication portal. We are <strong>not affiliated with, authorized, owned, or endorsed</strong> by the Government of Nagaland, Government of Sikkim, Government of West Bengal, or the Directorate of State Lotteries. All Dear Lottery and Lottery Sambad results are aggregated from officially published gazette records.
          </p>
          <p>
            <strong className="text-white">Strict No Ticket Sales Policy:</strong> We <strong>DO NOT sell lottery tickets</strong>, accept bets, process wagers, collect payments, or facilitate gambling in any form. This website does not induce, encourage, or promote lottery participation.
          </p>
          <p>
            <strong className="text-white">Verification & 18+ Advisory:</strong> All published numbers must be cross-verified with the official printed Government Gazette before discarding tickets or claiming prizes. Lottery participation is strictly restricted to adults aged <strong>18 years and older (১৮ বছর বা তার বেশি)</strong> in legal jurisdictions only. Play responsibly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>© {currentYear} Dear Result Live (dearresultlive.in). All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">18+ Only</span>
            <span>•</span>
            <span className="text-slate-400 font-medium">No Ticket Sales</span>
            <span>•</span>
            <span className="text-slate-400 font-medium">Independent Information Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
