import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuIcon, XIcon } from 'lucide-react';

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#contact', label: 'Contact' }
];

export function LandingHeader() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // The header bar itself switches between transparent-over-hero (with the
  // top scrim doing the readability work) and a solid translucent navy once
  // scrolled or the mobile menu is open. Nav text stays white in both cases.
  const barSolid = isScrolled || isMobileOpen;
  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        barSolid ? 'bg-[rgba(15,28,43,0.85)] backdrop-blur-md shadow-sm border-b border-white/10' : 'bg-transparent'
      }`}
    >
      {/* Independent top scrim — readability layer for the nav row only,
          separate from the hero's own left-to-right gradient. */}
      <div
        aria-hidden="true"
        className={`header-top-scrim absolute inset-x-0 top-0 h-[130px] pointer-events-none transition-opacity duration-300 ${
          barSolid ? 'opacity-0' : 'opacity-100'
        }`}
      />

      <div className="relative max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#38A3A5] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
              Arogya
            </h1>
            <p className="text-[11px] tracking-wide uppercase mt-1 text-white/80">
              Ministry of Health Sri Lanka
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="nav-link font-semibold text-sm tracking-wide uppercase text-white/90 hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white rounded-sm"
            >
              {link.label}
            </a>
          ))}
          <div className="flex items-center gap-3 pl-4 ml-1 border-l border-white/25">
            <button
              onClick={() => navigate('/login')}
              className="bg-[#38A3A5] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2d8284] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8284]"
            >
              Login
            </button>
          </div>
        </nav>

        <button
          type="button"
          onClick={() => setIsMobileOpen(open => !open)}
          aria-expanded={isMobileOpen}
          aria-controls="mobile-nav-menu"
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {isMobileOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </div>

      {isMobileOpen && (
        <nav id="mobile-nav-menu" className="md:hidden relative bg-white border-t border-gray-100 shadow-lg px-6 py-5">
          <div className="flex flex-col">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="py-3 text-base font-semibold text-gray-800 hover:text-[#38A3A5] border-b border-gray-50 last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5] rounded-sm"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => {
                closeMobileMenu();
                navigate('/login');
              }}
              className="w-full bg-[#38A3A5] text-white px-5 py-3 rounded-lg font-semibold hover:bg-[#2d8284] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8284]"
            >
              Login
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
