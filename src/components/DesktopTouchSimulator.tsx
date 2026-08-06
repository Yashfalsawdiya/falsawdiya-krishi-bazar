import React, { useEffect } from 'react';

export const DesktopTouchSimulator: React.FC = () => {
  useEffect(() => {
    // Only enable simulation on non-touch (desktop/laptop mouse) devices
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (isTouchDevice) {
      // Mobile / touch screen device — do nothing, keep native touch behavior
      return;
    }

    document.body.classList.add('desktop-touch-simulation');

    let isMouseDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialScrollLeft = 0;
    let initialScrollTop = 0;
    let activeScrollContainer: HTMLElement | null = null;
    let dragDistance = 0;

    // Velocity tracking for momentum scrolling
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocityX = 0;
    let velocityY = 0;
    let momentumAnimId: number | null = null;

    // Long press timer
    let longPressTimer: NodeJS.Timeout | null = null;
    let longPressTriggered = false;

    // Tap ripple generator
    const createRipple = (x: number, y: number, isLongPress = false) => {
      const ripple = document.createElement('div');
      ripple.className = isLongPress ? 'touch-longpress-ring' : 'touch-tap-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      document.body.appendChild(ripple);

      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, isLongPress ? 800 : 400);
    };

    // Helper to find the nearest scrollable parent container
    const findScrollableParent = (element: HTMLElement | null): HTMLElement => {
      let current = element;
      while (current && current !== document.body && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight;
        const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && current.scrollWidth > current.clientWidth;

        if (isScrollableY || isScrollableX) {
          return current;
        }
        current = current.parentElement;
      }
      return document.documentElement;
    };

    // Stop ongoing momentum animation
    const stopMomentum = () => {
      if (momentumAnimId !== null) {
        cancelAnimationFrame(momentumAnimId);
        momentumAnimId = null;
      }
    };

    // MOUSE DOWN HANDLER
    const handleMouseDown = (e: MouseEvent) => {
      // Only primary mouse button (left click)
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;

      // Don't intercept drag-scroll if interacting with form inputs/textareas or video controls
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[data-no-touch-scroll="true"]')
      ) {
        // Still allow click ripple
        createRipple(e.clientX, e.clientY);
        return;
      }

      stopMomentum();

      isMouseDown = true;
      isDragging = false;
      dragDistance = 0;
      longPressTriggered = false;

      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = performance.now();
      velocityX = 0;
      velocityY = 0;

      activeScrollContainer = findScrollableParent(target);
      initialScrollLeft = activeScrollContainer === document.documentElement 
        ? window.scrollX 
        : activeScrollContainer.scrollLeft;
      initialScrollTop = activeScrollContainer === document.documentElement 
        ? window.scrollY 
        : activeScrollContainer.scrollTop;

      // Start Long Press Timer (500ms)
      longPressTimer = setTimeout(() => {
        if (isMouseDown && dragDistance < 8) {
          longPressTriggered = true;
          createRipple(startX, startY, true);

          // Dispatch custom 'longpress' event
          const longPressEvent = new CustomEvent('longpress', {
            bubbles: true,
            cancelable: true,
            detail: { clientX: startX, clientY: startY }
          });
          target.dispatchEvent(longPressEvent);
        }
      }, 500);

      // Create a tap ripple
      createRipple(e.clientX, e.clientY);
    };

    // MOUSE MOVE HANDLER
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || !activeScrollContainer) return;

      const currentX = e.clientX;
      const currentY = e.clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      dragDistance = Math.hypot(deltaX, deltaY);

      // If dragged beyond threshold (5px), cancel long press and enter drag-scroll mode
      if (dragDistance > 5) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        if (!isDragging) {
          isDragging = true;
          document.body.classList.add('is-drag-scrolling');
        }

        const now = performance.now();
        const dt = Math.max(now - lastTime, 16); // avoid divide by zero

        // Instant velocity tracking
        velocityX = (currentX - lastX) / dt;
        velocityY = (currentY - lastY) / dt;

        lastX = currentX;
        lastY = currentY;
        lastTime = now;

        // Perform drag scroll on the container
        if (activeScrollContainer === document.documentElement) {
          window.scrollTo({
            left: initialScrollLeft - deltaX,
            top: initialScrollTop - deltaY,
            behavior: 'instant'
          });
        } else {
          activeScrollContainer.scrollLeft = initialScrollLeft - deltaX;
          activeScrollContainer.scrollTop = initialScrollTop - deltaY;
        }
      }
    };

    // MOUSE UP / LEAVE HANDLER
    const handleMouseUp = (e: MouseEvent) => {
      if (!isMouseDown) return;

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      document.body.classList.remove('is-drag-scrolling');

      if (isDragging && activeScrollContainer) {
        // Apply momentum scrolling
        let currentVx = velocityX * 16; // pixels per frame (assuming ~60fps)
        let currentVy = velocityY * 16;
        const targetContainer = activeScrollContainer;

        const animateMomentum = () => {
          if (Math.abs(currentVx) < 0.3 && Math.abs(currentVy) < 0.3) {
            momentumAnimId = null;
            return;
          }

          if (targetContainer === document.documentElement) {
            window.scrollBy(-currentVx, -currentVy);
          } else {
            targetContainer.scrollLeft -= currentVx;
            targetContainer.scrollTop -= currentVy;
          }

          // Friction decay (like mobile inertia)
          currentVx *= 0.92;
          currentVy *= 0.92;

          momentumAnimId = requestAnimationFrame(animateMomentum);
        };

        momentumAnimId = requestAnimationFrame(animateMomentum);
      }

      isMouseDown = false;
      isDragging = false;
      activeScrollContainer = null;
    };

    // PREVENT ACCIDENTAL CLICKS WHEN DRAGGING TO SCROLL
    const handleCaptureClick = (e: MouseEvent) => {
      if (dragDistance > 8) {
        e.preventDefault();
        e.stopPropagation();
        dragDistance = 0;
      }
    };

    // Attach global desktop event listeners
    window.addEventListener('mousedown', handleMouseDown, { capture: true, passive: false });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true, passive: true });
    window.addEventListener('click', handleCaptureClick, { capture: true });

    return () => {
      document.body.classList.remove('desktop-touch-simulation', 'is-drag-scrolling');
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('click', handleCaptureClick, { capture: true });
      if (longPressTimer) clearTimeout(longPressTimer);
      stopMomentum();
    };
  }, []);

  return null;
};

export default DesktopTouchSimulator;
