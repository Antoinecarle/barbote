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

  const handleSkip = () => {
    setFadeOut(true);
    setTimeout(onComplete, 400);
  };

  return (
    <div
      className={`video-loading transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Full-screen video */}
      <video
        ref={videoRef}
        src="/intro.mp4"
        muted
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Skip Intro button — fixed top-right, Netflix/Apple style */}
      <button
        onClick={handleSkip}
        style={{
          position: 'absolute',
          top: '24px',
          right: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 18px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '0.01em',
          cursor: 'pointer',
          transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.28)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.45)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.15)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.25)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.9)';
        }}
      >
        Passer l'intro
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginTop: '1px' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Full-width progress bar at the very bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255, 255, 255, 0.15)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#8B1A2F',
            transition: 'width 0.3s linear',
          }}
        />
      </div>
    </div>
  );
}
