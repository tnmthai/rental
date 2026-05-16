'use client';
import { useEffect } from 'react';

export default function Histats() {
  useEffect(() => {
    // @ts-ignore
    var _Hasync: any[] = (window as any)._Hasync = (window as any)._Hasync || [];
    _Hasync.push(['Histats.start', '1,5027110,4,24,200,50,00011111']);
    _Hasync.push(['Histats.fasi', '1']);
    _Hasync.push(['Histats.track_hits', '']);
    const hs = document.createElement('script');
    hs.type = 'text/javascript';
    hs.async = true;
    hs.src = 'https://s10.histats.com/js15_as.js';
    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
  }, []);

  return (
    <>
      <div id="histats_counter"></div>
      <noscript>
        <a href="/" target="_blank">
          <img src="https://sstatic1.histats.com/0.gif?5027110&101" alt="" />
        </a>
      </noscript>
      <script type="text/javascript" src="https://s10.histats.com/counters/fr_24.js"></script>
    </>
  );
}
