'use client';

import { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';

const ELAPSED_TIME_KEY = 'leadsorter_elapsed_time';

export function SessionTimer() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load elapsed time from localStorage on initial render
  useEffect(() => {
    const savedTime = localStorage.getItem(ELAPSED_TIME_KEY);
    setElapsedTime(savedTime ? parseInt(savedTime, 10) : 0);
  }, []);

  // Effect to handle the timer logic
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is inactive, clear the interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Tab is active, start the interval if it's not already running
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            setElapsedTime(prevTime => {
              const newTime = prevTime + 1;
              localStorage.setItem(ELAPSED_TIME_KEY, String(newTime));
              return newTime;
            });
          }, 1000);
        }
      }
    };

    // Start timer only when tab is visible
    if (!document.hidden) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prevTime => {
          const newTime = prevTime + 1;
          localStorage.setItem(ELAPSED_TIME_KEY, String(newTime));
          return newTime;
        });
      }, 1000);
    }

    // Listen for visibility changes to pause/resume the timer
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return (
      String(hours).padStart(2, '0') +
      ':' +
      String(minutes).padStart(2, '0') +
      ':' +
      String(seconds).padStart(2, '0')
    );
  };

  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
      <Timer className="h-4 w-4" />
      <span>{formatTime(elapsedTime)}</span>
    </div>
  );
}
