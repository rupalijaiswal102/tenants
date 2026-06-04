import { useState, useEffect } from 'react';

interface Breakpoints {
  isMobile:  boolean;  // < 640px
  isTablet:  boolean;  // 640–1024px
  isDesktop: boolean;  // > 1024px
  width:     number;
}

export function useResponsive(): Breakpoints {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    isMobile:  width < 640,
    isTablet:  width >= 640 && width <= 1024,
    isDesktop: width > 1024,
    width,
  };
}
