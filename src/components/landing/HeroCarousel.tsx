import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { heroSlides } from './heroSlides';

const AUTO_ROTATE_MS = 7000;
const CROSSFADE_MS = 1400;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);
  return reduced;
}

/**
 * Full-bleed hero background. Renders as a single static image when only one
 * slide is configured; automatically becomes a crossfade carousel with dots
 * and autoplay once more slides are added to heroSlides.ts.
 */
export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const intervalRef = useRef<number>();

  const hasMultipleSlides = heroSlides.length > 1;
  const isPlaying = hasMultipleSlides && !userPaused && !hoverPaused && !reducedMotion;

  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % heroSlides.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(intervalRef.current);
  }, [isPlaying]);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const pauseOnInteraction = () => hasMultipleSlides && setHoverPaused(true);
  const resumeAfterInteraction = () => hasMultipleSlides && setHoverPaused(false);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={pauseOnInteraction}
      onMouseLeave={resumeAfterInteraction}
      onFocus={pauseOnInteraction}
      onBlur={resumeAfterInteraction}
      {...(hasMultipleSlides
        ? { role: 'region', 'aria-roledescription': 'carousel', 'aria-label': 'Featured healthcare moments' }
        : {})}
    >
      {heroSlides.map((slide, index) => {
        const isActive = index === activeIndex;
        const style: CSSProperties & { [cssVar: `--${string}`]: string } = {
          backgroundImage: `url(${slide.image})`,
          opacity: isActive ? 1 : 0,
          transform: isActive && !reducedMotion ? 'scale(1.045)' : 'scale(1)',
          transitionProperty: 'opacity, transform',
          transitionDuration: reducedMotion ? '0ms, 0ms' : `${CROSSFADE_MS}ms, ${AUTO_ROTATE_MS + 1200}ms`,
          transitionTimingFunction: 'ease-in-out',
          '--hero-focal-mobile': slide.focal?.mobile ?? 'center',
          '--hero-focal-desktop': slide.focal?.desktop ?? 'center'
        };
        return (
          <div
            key={slide.id}
            className="hero-slide-image absolute inset-0 bg-cover bg-no-repeat"
            style={style}
            role="img"
            aria-label={slide.alt}
            aria-hidden={!isActive}
          />
        );
      })}

      {/* Left-to-right readability gradient, tuned for white hero text on the left. */}
      <div className="hero-overlay absolute inset-0 pointer-events-none" />
      {/* Extra bottom scrim for mobile, where the text sits over the busiest part of the image. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1826]/55 via-transparent to-transparent md:hidden pointer-events-none" />

      {hasMultipleSlides && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUserPaused(paused => !paused)}
            aria-label={userPaused ? 'Resume automatic slideshow' : 'Pause automatic slideshow'}
            className="flex items-center justify-center w-7 h-7 rounded-full text-white/80 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {userPaused ? <PlayIcon className="w-3.5 h-3.5" /> : <PauseIcon className="w-3.5 h-3.5" />}
          </button>
          <div role="tablist" aria-label="Hero slides" className="flex items-center gap-2">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Show slide ${index + 1} of ${heroSlides.length}`}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
