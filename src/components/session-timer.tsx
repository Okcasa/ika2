'use client';

import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const SESSION_START_KEY = 'leadsorter_session_start';

export function SessionTimer() {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    let sessionStart = localStorage.getItem(SESSION_START_KEY);
    if (!sessionStart) {
      sessionStart = new Date().toISOString();
      localStorage.setItem(SESSION_START_KEY, sessionStart);
    }

    const startTime = new Date(sessionStart).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = now - startTime;

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const formattedTime = 
        String(hours).padStart(2, '0') + ':' + 
        String(minutes).padStart(2, '0') + ':' + 
        String(seconds).padStart(2, '0');
      
      setElapsedTime(formattedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
      <Timer className="h-4 w-4" />
      <span>{elapsedTime}</span>
    </div>
  );
}
