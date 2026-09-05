import React, { useEffect } from 'react';

export const DesktopTouchSimulator: React.FC = () => {
  useEffect(() => {
    // Clean up any residual touch simulation classes so desktop mouse interactions remain native
    document.body.classList.remove('desktop-touch-simulation', 'is-drag-scrolling');
  }, []);

  return null;
};

export default DesktopTouchSimulator;
