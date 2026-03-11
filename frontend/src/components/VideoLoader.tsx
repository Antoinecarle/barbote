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
      <video
        ref={videoRef}
        src="/intro.mp4"
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="video-loading-overlay">
        <div className="flex flex-col items-center gap-4 w-full max-w-md px-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🍷</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Barbote</h1>
              <p className="text-sm text-gray-300">Traçabilité Cuverie</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-1">
            <div
              className="bg-bordeaux-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={handleSkip}
            className="text-sm text-white/60 hover:text-white/90 transition-colors mt-2"
          >
            Passer →
          </button>
        </div>
      </div>
    </div>
  );
}
