import React, { useEffect, useState } from 'react';
import { Play, Zap, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 500);
    const timer2 = setTimeout(() => setStage(2), 1200);
    const timer3 = setTimeout(() => setStage(3), 2000);
    const timer4 = setTimeout(() => {
      setIsVisible(false);
    }, 2800);
    const timer5 = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center transition-opacity duration-400 opacity-0">
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-white rounded-full animate-float ${
              stage >= 1 ? 'opacity-30' : 'opacity-0'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glowing orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl transition-all duration-1000 ${
          stage >= 1 ? 'opacity-30 scale-100' : 'opacity-0 scale-50'
        }`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl transition-all duration-1000 delay-300 ${
          stage >= 1 ? 'opacity-30 scale-100' : 'opacity-0 scale-50'
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl transition-all duration-1000 delay-150 ${
          stage >= 1 ? 'opacity-20 scale-100' : 'opacity-0 scale-75'
        }`}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        {/* Logo container */}
        <div className={`mb-8 transition-all duration-1000 ${
          stage >= 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-8'
        }`}>
          <div className="relative">
            {/* Logo background glow */}
            <div className={`absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl filter blur-xl transition-all duration-1000 ${
              stage >= 2 ? 'opacity-50 scale-110' : 'opacity-0 scale-100'
            }`}></div>
            
            {/* Logo container */}
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <div className={`transition-all duration-500 ${
                stage >= 2 ? 'animate-pulse' : ''
              }`}>
                <Play className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Sparkle effects */}
            {stage >= 2 && (
              <>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
                <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 text-blue-400 animate-bounce delay-150" />
                <Zap className="absolute -top-2 -left-2 w-5 h-5 text-purple-400 animate-bounce delay-300" />
              </>
            )}
          </div>
        </div>

        {/* Brand name */}
        <div className={`transition-all duration-1000 delay-300 ${
          stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-4">
            VideoHub
          </h1>
          <p className="text-lg text-gray-300 font-light">
            Powering your video workflow
          </p>
        </div>

        {/* Loading indicator */}
        <div className={`mt-12 transition-all duration-500 delay-700 ${
          stage >= 3 ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
            </div>
            <span className="text-gray-300 text-sm ml-3">Loading your workspace...</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`mt-8 w-64 mx-auto transition-all duration-500 delay-1000 ${
          stage >= 3 ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-1 rounded-full transition-all duration-1000 ease-out"
                 style={{ width: stage >= 3 ? '100%' : '0%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
