import hero1 from '../../assests/hero1.png';
import hero2 from '../../assests/hero2.png';
import hero3 from '../../assests/hero3.png';
import hero4 from '../../assests/hero4.png';

export interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  /** CSS background-position per breakpoint, so subjects are never badly cropped. */
  focal?: {
    mobile?: string;
    desktop?: string;
  };
}

/**
 * Ordered to read as a short story: the mobile clinic reaching a village,
 * a doctor caring for a patient outdoors, a close consultation, then the
 * care team. Reorder or add entries here — the carousel (crossfade, dots,
 * autoplay) activates automatically once there's more than one slide.
 */
export const heroSlides: HeroSlide[] = [
  {
    id: 'mobile-clinic-village-queue',
    image: hero3,
    alt: 'A mobile health clinic van serving a queue of patients under the trees in a rural Sri Lankan village',
    focal: {
      mobile: '82% 50%',
      desktop: 'center 55%'
    }
  },
  {
    id: 'outdoor-patient-consultation',
    image: hero4,
    alt: 'A doctor consulting an elderly patient at an outdoor table beside the mobile clinic van',
    focal: {
      mobile: '75% 55%',
      desktop: 'center 55%'
    }
  },
  {
    id: 'mobile-clinic-consultation',
    image: hero1,
    alt: 'A doctor and nurse attending to a patient at a mobile health clinic in Sri Lanka',
    focal: {
      mobile: '72% 30%',
      desktop: 'center 38%'
    }
  },
  {
    id: 'care-team-portrait',
    image: hero2,
    alt: "Arogya's care team — a doctor, nurse, and clinic coordinator — standing together in a hospital corridor",
    focal: {
      mobile: '75% 15%',
      desktop: 'center 20%'
    }
  }
];
