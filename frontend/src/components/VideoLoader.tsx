import React, { useEffect, useRef, useState } from 'react';

interface VideoLoaderProps {
  onComplete: () => void;
}

export default function VideoLoader({ onComplete }: VideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      setFadeOut(true);
      setTimeout(onComplete, 800);
    };

    const handleError = () => {
      // If video fails, skip immediately
      onComplete();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Auto-play
    video.play().catch(() => {
      // If autoplay blocked, show skip button
    });

    // Max wait 10 seconds
    const timeout = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 800);
    }, 10000);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSkip = () => {
    setFadeOut(true);
    setTimeout(onComplete, 400);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        backgroundColor: '#0D0A0B',
        transition: 'opacity 0.7s ease',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* LEFT PANEL — Brand content */}
      <div
        style={{
          width: '45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          gap: '24px',
        }}
      >
        {/* Logo card */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: 'rgba(139, 26, 47, 0.18)',
            border: '1px solid rgba(139, 26, 47, 0.35)',
            fontSize: '26px',
            flexShrink: 0,
          }}
        >
          🍷
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '3.25rem',
              fontWeight: 700,
              color: '#F5F0F1',
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Barbote
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 500,
              color: 'rgba(245, 240, 241, 0.55)',
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Traçabilité Cuverie
          </p>
        </div>

        {/* Description */}
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'rgba(245, 240, 241, 0.45)',
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.65,
            maxWidth: '360px',
          }}
        >
          Gérez vos cuvées, suivez vos lots et assurez la conformité de votre production vinicole.
        </p>

        {/* Skip button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={handleSkip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '9999px',
              backgroundColor: '#8B1A2F',
              border: 'none',
              color: '#F5F0F1',
              fontSize: '0.9375rem',
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, transform 0.15s ease',
              alignSelf: 'flex-start',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6F1526';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#8B1A2F';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Passer l'intro
            <span style={{ fontSize: '1rem' }}>→</span>
          </button>

          <span
            style={{
              fontSize: '0.75rem',
              color: 'rgba(245, 240, 241, 0.28)',
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            Appuyez sur Échap pour passer
          </span>
        </div>
      </div>

      {/* RIGHT PANEL — Portrait video */}
      <div
        style={{
          width: '55%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 60px 40px 20px',
        }}
      >
        {/* Video card container */}
        <div
          style={{
            position: 'relative',
            maxHeight: '85vh',
            aspectRatio: '9 / 16',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(139, 26, 47, 0.3)',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.35)',
            backgroundColor: '#0D0A0B',
          }}
        >
          <video
            ref={videoRef}
            src="/intro.mp4"
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />

          {/* Progress bar at bottom of video card */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(245, 240, 241, 0.12)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: '#8B1A2F',
                transition: 'width 0.3s linear',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
