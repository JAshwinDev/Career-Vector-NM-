import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function HeroSection({ onGetStarted, isLoggedIn = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      // Text Reveal
      gsap.set(".reveal-text", { y: "110%", opacity: 0 });
      tl.to(".reveal-text", 
        { y: "0%", opacity: 1, duration: 1.2, stagger: 0.1, delay: 0.2 }
      );

      // Ambient floating animations for Bauhaus elements
      gsap.to(".shape-circle", { rotation: 90, scale: 1.05, duration: 10, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".shape-arch", { y: -20, duration: 4, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".shape-triangle", { rotation: -15, scale: 1.02, duration: 6, yoyo: true, repeat: -1, ease: "sine.inOut" });

      // Mouse Magnetic Interaction for Bauhaus Shapes
      const handleMouseMove = (e) => {
        const shapes = document.querySelectorAll('.bauhaus-shape');
        shapes.forEach(shape => {
          const rect = shape.getBoundingClientRect();
          const currentX = gsap.getProperty(shape, "x") || 0;
          const currentY = gsap.getProperty(shape, "y") || 0;
          
          // Calculate original center without transform
          const originX = rect.left - currentX + rect.width / 2;
          const originY = rect.top - currentY + rect.height / 2;
          
          const distX = e.clientX - originX;
          const distY = e.clientY - originY;
          const distance = Math.sqrt(distX * distX + distY * distY);
          
          const maxDist = 400;
          
          if (distance < maxDist) {
            // Smooth interpolation: the closer the mouse, the stronger the pull
            const pullStrength = 0.5 * (1 - Math.pow(distance / maxDist, 2));
            
            gsap.to(shape, {
              x: distX * pullStrength,
              y: distY * pullStrength,
              duration: 1.5,
              ease: "power3.out",
              overwrite: "auto"
            });
          } else {
            // Smooth return to origin without aggressive elastic snapping
            gsap.to(shape, {
              x: 0,
              y: 0,
              duration: 2,
              ease: "power3.out",
              overwrite: "auto"
            });
          }
        });
      };

      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <section className="section" ref={containerRef} style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Background Shapes */}
      <div className="bauhaus-interactive-area" style={{ zIndex: 1 }}></div>
      <div className="bauhaus-shape shape-circle" style={{ top: '-10%', left: '-5%' }}></div>
      <div className="bauhaus-shape shape-arch" style={{ bottom: '0', right: '15%' }}></div>
      <div className="bauhaus-shape shape-triangle" style={{ top: '20%', right: '-5%' }}></div>

      <div className="container" style={{ textAlign: 'center', zIndex: 2, pointerEvents: 'none' }}>
        <h1 className="massive-title" style={{ marginBottom: '2rem', pointerEvents: 'auto' }}>
          <div className="reveal-wrapper"><span className="reveal-text">Career</span></div>
          <br />
          <div className="reveal-wrapper"><span className="reveal-text">Vector</span></div>
        </h1>
        
        <div style={{ pointerEvents: 'auto' }}>
          <div className="reveal-wrapper">
            <p className="reveal-text" style={{ fontSize: 'clamp(1.25rem, 2.4vw, 2rem)', color: 'var(--text-soft)', maxWidth: '820px', margin: '0 auto 3rem auto', fontWeight: 600 }}>
              A guided student profile for resume readiness, role fit, learning roadmaps, and honest peer benchmarks.
            </p>
          </div>
        </div>

        <div style={{ pointerEvents: 'auto' }}>
          <div className="reveal-wrapper">
            <div className="reveal-text">
              <button className="btn-primary" onClick={onGetStarted}>
                {isLoggedIn ? "Analyze My Skills" : "Create Student Profile"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
