// src/components/NotFound.tsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';

const NotFound: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [count, setCount] = useState(5);
  
  // Track mouse position for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Countdown timer
  useEffect(() => {
    if (count <= 0) return;
    
    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large glowing orb */}
        <div 
          className="absolute rounded-full bg-purple-600 opacity-20 blur-3xl"
          style={{ 
            width: '60vw', 
            height: '60vw', 
            top: '40%', 
            left: '50%',
            transform: `translate(-50%, -50%) translate(${mousePosition.x * -50}px, ${mousePosition.y * -50}px)`,
            transition: 'transform 0.2s ease-out'
          }}
        />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: `${mousePosition.x * 20}px ${mousePosition.y * 20}px`,
            transition: 'background-position 0.2s ease-out'
          }}
        />
        
        {/* Floating shapes */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 200 + 50}px`,
              height: `${Math.random() * 200 + 50}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              background: `rgba(${Math.random() * 100 + 100}, ${Math.random() * 50}, ${Math.random() * 150 + 100}, 0.3)`,
              filter: 'blur(60px)',
              transform: `translate(${mousePosition.x * (i+1) * -15}px, ${mousePosition.y * (i+1) * -15}px)`,
              transition: 'transform 0.2s ease-out',
              animation: `float-${i} ${Math.random() * 10 + 20}s ease-in-out infinite`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        {/* 404 Text */}
        <div 
          className="relative mb-4 text-[10rem] font-bold leading-none tracking-tighter text-white sm:text-[12rem] md:text-[16rem]"
          style={{
            textShadow: '0 0 40px rgba(139, 92, 246, 0.8)',
            transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
            transition: 'transform 0.2s ease-out'
          }}
        >
          404
          <div 
            className="absolute inset-0 opacity-50 blur-xl"
            style={{
              color: 'transparent',
              backgroundImage: 'linear-gradient(to bottom right, #8b5cf6, #ec4899)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              transform: `translate(${mousePosition.x * -30}px, ${mousePosition.y * -30}px)`,
              transition: 'transform 0.2s ease-out'
            }}
          >
            404
          </div>
        </div>
        
        <div 
          className="mb-6 text-2xl font-medium text-white md:text-4xl"
          style={{
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`,
            transition: 'transform 0.2s ease-out'
          }}
        >
          <span className="text-pink-400">Houston</span>, we have a problem
        </div>
        
        <div className="mb-12 max-w-md text-gray-300">
          <p>The tool you're looking for has vanished into the digital void.</p>
          <p>Perhaps it was never there, or perhaps it's just hiding really well.</p>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Link 
            to="/" 
            className="group flex items-center space-x-2 rounded-full bg-white bg-opacity-10 px-6 py-3 backdrop-blur-lg transition-all duration-300 hover:bg-opacity-20"
          >
            <ArrowLeft 
              size={20} 
              className="transition-transform duration-300 group-hover:-translate-x-1" 
            />
            <span>Go back</span>
          </Link>
          
          <Link 
            to="/" 
            className="group flex items-center space-x-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-white transition-all duration-300 hover:from-purple-700 hover:to-pink-700"
          >
            <Home size={20} />
            <span>
              {count > 0 ? `Return to home in ${count}s` : 'Return to home'}
            </span>
          </Link>
        </div>
        
        {/* Lost in space animation */}
        <div 
          className="absolute bottom-8 right-8 animate-float hidden md:block"
          style={{
            animation: 'float 6s ease-in-out infinite',
            transform: `translate(${mousePosition.x * -40}px, ${mousePosition.y * -40}px)`,
            transition: 'transform 0.2s ease-out'
          }}
        >
          <div className="relative">
            <div className="absolute -inset-2 rounded-full opacity-50 blur-lg" style={{ background: 'linear-gradient(to right, #8b5cf6, #ec4899)' }} />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black p-2">
              <Compass className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-8 left-1/2 h-8 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-500 to-transparent opacity-50" />
          </div>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-0 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(40px); }
        }
        
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-50px); }
        }
        
        @keyframes float-3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(25px); }
        }
        
        @keyframes float-4 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes float-5 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(35px); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;