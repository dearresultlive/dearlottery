async function verifyProduction() {
  const pages = [
    { name: 'Homepage (2026-10-23)', url: 'https://dearresultlive.in/' },
    { name: 'Today 1PM (2026-10-23/1pm)', url: 'https://dearresultlive.in/results/2026-10-23/1pm' },
    { name: 'Today 6PM (2026-10-23/6pm)', url: 'https://dearresultlive.in/results/2026-10-23/6pm' },
    { name: 'Today 8PM (2026-10-23/8pm)', url: 'https://dearresultlive.in/results/2026-10-23/8pm' },
    { name: 'Yesterday 1PM (2026-10-22/1pm)', url: 'https://dearresultlive.in/results/2026-10-22/1pm' },
    { name: 'Yesterday 6PM (2026-10-22/6pm)', url: 'https://dearresultlive.in/results/2026-10-22/6pm' },
    { name: 'Yesterday 8PM (2026-10-22/8pm)', url: 'https://dearresultlive.in/results/2026-10-22/8pm' }
  ];

  for (const p of pages) {
    const res = await fetch(p.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const html = await res.text();
    const imgs = [...html.matchAll(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/gi)].map(m => m[1]);
    const gazetteImg = imgs.find(src => src.includes('/results/') || src.includes('gazette-sheet') || src.includes('sheet-image'));
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    const descMatch = html.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]+)['"]/i);
    const desc = descMatch ? descMatch[1] : '';
    const hasFalseWinnerToday = p.url.includes('2026-10-23') && (title.includes('48E 97746') || desc.includes('48E 97746') || desc.includes('winning ticket is'));

    console.log('----------------------------------------------------');
    console.log(p.name, '-> HTTP', res.status);
    console.log('Title:', title.slice(0, 90));
    console.log('Gazette Image in HTML:', gazetteImg || 'NONE (MISSING)');
    console.log('False Winner on Today Slot:', hasFalseWinnerToday ? 'FAIL [False Data]' : 'PASS [Clean SEO]');
  }
}
verifyProduction();
