import React from 'react';

const AnimationStyles: React.FC = () => {
  return (
    <style>{`
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      .pulse-animation {
        animation: pulse 0.5s ease;
      }
      
      @keyframes highlight {
        0% { background-color: rgba(79, 70, 229, 0.1); }
        100% { background-color: transparent; }
      }
      .highlight-animation {
        animation: highlight 1s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .fade-in {
        animation: fadeIn 0.3s ease-out forwards;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      .float-animation {
        animation: float 3s ease-in-out infinite;
      }
      
      .slider-thumb::before {
        content: '';
        width: 16px;
        height: 16px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        cursor: pointer;
        margin-top: -6px;
        border: 2px solid rgba(79, 70, 229, 0.8);
        transition: all 0.2s ease;
      }
      
      input[type=range]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      }
      
      .glass-effect {
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .depth-effect {
        box-shadow: 
          0 2px 10px rgba(0, 0, 0, 0.05),
          0 10px 20px rgba(79, 70, 229, 0.1);
      }
      
      .ripple-bg {
        background-image: radial-gradient(
          circle at center,
          rgba(79, 70, 229, 0.1) 0%, 
          rgba(79, 70, 229, 0.05) 25%, 
          rgba(79, 70, 229, 0.01) 70%, 
          transparent 100%
        );
      }
    `}</style>
  );
};

export default AnimationStyles;