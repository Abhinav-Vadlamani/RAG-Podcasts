// components/TypingMessage.tsx
import React, { useState, useEffect } from 'react';

interface TypingMessageProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({ 
  text, 
  onComplete, 
  speed = 30 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    let currentIndex = 0;
    setDisplayedText('');
    setIsComplete(false);
    
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        setTimeout(() => {
          onComplete?.();
        }, 500); // Wait 500ms after typing completes
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <div className="flex justify-start mb-6">
      <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 px-6 py-5 rounded-3xl rounded-tl-lg max-w-xs lg:max-w-3xl shadow-lg border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
              {displayedText}
              {!isComplete && (
                <span className="inline-block w-0.5 h-5 bg-blue-500 ml-1 animate-pulse"></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingMessage;