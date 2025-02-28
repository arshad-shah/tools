import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Element } from '../../types/PeriodicTableTypes';

interface ElementModel3DProps {
  element: Element;
  containerSize: { width: number; height: number };
}

const ElementModel3D: React.FC<ElementModel3DProps> = ({ 
  element, 
  containerSize 
}) => {
  const modelContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const electronsRef = useRef<THREE.Object3D[]>([]);
  const shellsRef = useRef<THREE.Object3D[]>([]);
  const nucleusRef = useRef<THREE.Mesh | null>(null);
  
  // Interactive state
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [zoom, setZoom] = useState(5);
  
  // Track mouse for rotation
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  
  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.max(2, prev - 1));
  const handleZoomOut = () => setZoom(prev => Math.min(10, prev + 1));
  
  // Reset view to default top-down position
  const handleReset = () => {
    setZoom(5);
    
    if (sceneRef.current) {
      sceneRef.current.rotation.x = 0;
      sceneRef.current.rotation.y = 0;
      sceneRef.current.rotation.z = 0;
    }
    
    if (cameraRef.current) {
      cameraRef.current.position.y = 5 * 1.5;
      cameraRef.current.position.z = 0;
      cameraRef.current.position.x = 0;
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  useEffect(() => {
    if (!modelContainerRef.current) return;
    
    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Set black background explicitly
    
    const camera = new THREE.PerspectiveCamera(
      75,
      containerSize.width / containerSize.height,
      0.1,
      1000
    );
    
    // Use WebGL2 renderer if available for better performance
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    const container = modelContainerRef.current;
    
    // Set renderer properties
    renderer.setSize(containerSize.width, containerSize.height);
    renderer.setClearColor(0x000000, 1); // Set full opacity for background
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio to avoid performance issues
    
    // Check if we already have a canvas and remove it if needed
    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) {
      try {
        container.removeChild(existingCanvas);
      } catch (e) {
        console.warn('Canvas removal error:', e);
      }
    }
    
    // Only append the renderer if not already present
    if (!container.querySelector('canvas')) {
      // Now append the renderer
    container.appendChild(renderer.domElement);
    }
    
    // Add mouse event listeners for interaction
    const handleMouseDown = (event: MouseEvent) => {
      event.preventDefault(); // Prevent default to ensure proper drag handling
      isDragging.current = true;
      lastMousePosition.current.x = event.clientX;
      lastMousePosition.current.y = event.clientY;
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging.current && sceneRef.current) {
        const deltaX = event.clientX - lastMousePosition.current.x;
        const deltaY = event.clientY - lastMousePosition.current.y;
        
        sceneRef.current.rotation.y += deltaX * 0.01;
        sceneRef.current.rotation.x += deltaY * 0.01;
        
        lastMousePosition.current.x = event.clientX;
        lastMousePosition.current.y = event.clientY;
      }
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault(); // Prevent page scroll
      const newZoom = zoom + Math.sign(event.deltaY) * 0.5;
      setZoom(Math.min(Math.max(newZoom, 2), 10));
    };
    
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    // Add touch support for mobile
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        event.preventDefault();
        isDragging.current = true;
        lastMousePosition.current.x = event.touches[0].clientX;
        lastMousePosition.current.y = event.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (event: TouchEvent) => {
      if (isDragging.current && event.touches.length === 1 && sceneRef.current) {
        const deltaX = event.touches[0].clientX - lastMousePosition.current.x;
        const deltaY = event.touches[0].clientY - lastMousePosition.current.y;
        
        sceneRef.current.rotation.y += deltaX * 0.01;
        sceneRef.current.rotation.x += deltaY * 0.01;
        
        lastMousePosition.current.x = event.touches[0].clientX;
        lastMousePosition.current.y = event.touches[0].clientY;
      }
    };
    
    const handleTouchEnd = () => {
      isDragging.current = false;
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    // Update refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    
    // Set camera position
    camera.position.z = zoom;
    
    // Add lighting setup
    const addLights = () => {
      // Soft ambient light
      const ambientLight = new THREE.AmbientLight(0x222244, 0.6);
      scene.add(ambientLight);
      
      // Main directional light with warm tone
      const mainLight = new THREE.DirectionalLight(0xffffaa, 1.2);
      mainLight.position.set(1, 2, 3);
      scene.add(mainLight);
      
      // Cool rim light for contrast
      const rimLight = new THREE.DirectionalLight(0x6677ff, 0.8);
      rimLight.position.set(-2, -1, -1);
      scene.add(rimLight);
      
      // Core nucleus light with animated intensity
      const nucleusLight = new THREE.PointLight(0xff7700, 2, 15);
      nucleusLight.position.set(0, 0, 0);
      scene.add(nucleusLight);
    };
    
    // Get color for electron shell based on index
    const getShellColor = (index: number): number => {
      const colors = [
        0x00bfff, // Deep Sky Blue
        0x7eff00, // Bright Green
        0xff9500, // Bright Orange
        0xff00ff, // Magenta
        0x00ffff, // Cyan
        0xffff00, // Yellow
        0xff3838  // Bright Red
      ];
      
      return colors[index % colors.length];
    };
    
    // Create a glow effect for objects - Fixed version
    const createGlow = (object: THREE.Mesh, color: number, scale: number) => {
      // Simplified glow using meshes instead of complex shaders
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        side: THREE.FrontSide
      });

      const glowGeometry = object.geometry.clone();
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.scale.multiplyScalar(scale);
      glowMesh.position.copy(object.position);
      
      return glowMesh;
    };
    
    // Build the atom model
    const buildAtomModel = () => {
      try {
        // Parse electron configuration
        const shells = element.electrons.split(',').map(n => parseInt(n.trim()));
        
        // Create nucleus
        const nucleusSize = 0.7;
        const nucleusGeometry = new THREE.IcosahedronGeometry(nucleusSize, 3);
        
        // Create a texture for the nucleus
        const nucleusCanvas = document.createElement('canvas');
        nucleusCanvas.width = 512;
        nucleusCanvas.height = 512;
        const context = nucleusCanvas.getContext('2d');
        
        if (context) {
          // Create gradient background
          const gradient = context.createRadialGradient(
            256, 256, 0,
            256, 256, 256
          );
          gradient.addColorStop(0, '#ff5e00');
          gradient.addColorStop(0.5, '#ff2d00');
          gradient.addColorStop(1, '#990000');
          
          context.fillStyle = gradient;
          context.fillRect(0, 0, 512, 512);
          
          // Add dynamic texture effect
          context.globalAlpha = 0.3;
          for (let i = 0; i < 800; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 3 + 1;
            
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = Math.random() > 0.7 ? '#ffff00' : (Math.random() > 0.5 ? '#ffffff' : '#550000');
            context.fill();
          }
          
          // Draw element symbol
          context.globalAlpha = 1.0;
          context.shadowColor = '#ffaa00';
          context.shadowBlur = 25;
          context.font = 'bold 120px Arial';
          context.fillStyle = 'white';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(element.symbol, 256, 256);
        }
        
        const nucleusTexture = new THREE.CanvasTexture(nucleusCanvas);
        
        // Create nucleus material
        const nucleusMaterial = new THREE.MeshStandardMaterial({ 
          map: nucleusTexture,
          metalness: 0.3,
          roughness: 0.2,
          emissive: 0xff3300,
          emissiveIntensity: 0.4
        });
        
        const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
        nucleusRef.current = nucleus;
        scene.add(nucleus);
        
        // Create nucleus glow - simpler version
        const nucleusGlow = createGlow(nucleus, 0xff4500, 1.3);
        scene.add(nucleusGlow);
        
        // Make all shell rings perfectly flat in the XZ plane
        shells.forEach((electronsInShell, shellIndex) => {
          // Create shell ring
          const shellRadius = 1 + shellIndex * 0.8;
          const shellColor = getShellColor(shellIndex);
          
          // Create a perfect ring in the XZ plane
          const ringPoints = [];
          const segments = 100;
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            ringPoints.push(
              new THREE.Vector3(
                shellRadius * Math.cos(angle),
                0, // Keep y at 0 for flat horizontal plane
                shellRadius * Math.sin(angle)
              )
            );
          }
          
          // Create ring geometry from points
          const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
          const ringMaterial = new THREE.LineBasicMaterial({
            color: shellColor,
            transparent: true,
            opacity: 0.7,
            linewidth: 2
          });
          
          const ring = new THREE.Line(ringGeometry, ringMaterial);
          scene.add(ring);
          shellsRef.current.push(ring);
          
          // Shell container for electron orbits
          const shellContainer = new THREE.Object3D();
          shellContainer.userData = { shellIndex };
          scene.add(shellContainer);
          
          // Create electrons for this shell
          for (let i = 0; i < electronsInShell; i++) {
            // Create electron geometry
            const electronGeometry = new THREE.SphereGeometry(0.12, 24, 24);
            
            // Create electron material
            const electronMaterial = new THREE.MeshStandardMaterial({ 
              color: shellColor,
              metalness: 0.8,
              roughness: 0.2,
              emissive: shellColor,
              emissiveIntensity: 0.7
            });
            
            const electron = new THREE.Mesh(electronGeometry, electronMaterial);
            electron.userData = { shellIndex, electronIndex: i, shellRadius };
            
            // Create an orbital container that will rotate around the center
            const orbitalContainer = new THREE.Object3D();
            orbitalContainer.userData = { shellIndex, electronIndex: i };
            
            // Position electron along the orbital path (same plane as the visual ring)
            // Initialize on the ring (in XZ plane for horizontal orbits)
            const angle = (i * 2 * Math.PI) / electronsInShell;
            electron.position.x = shellRadius * Math.cos(angle);
            electron.position.z = shellRadius * Math.sin(angle); // Use Z instead of Y for horizontal orbits
            electron.position.y = 0;
            
            // Add electron to the orbital container
            orbitalContainer.add(electron);
            
            // Simple glow for electrons
            const electronGlow = createGlow(electron, shellColor, 1.7);
            orbitalContainer.add(electronGlow);
            
            // No tilts - keep everything perfectly flat in the horizontal plane
            // We want perfect circular orbits when viewed from above
            orbitalContainer.rotation.x = 0;
            orbitalContainer.rotation.y = 0;
            
            shellContainer.add(orbitalContainer);
            electronsRef.current.push(orbitalContainer);
          }
        });
      } catch (error) {
        console.error("Error building atom model:", error);
      }
    };
    
    // Animation function
    const animate = () => {
      try {
        if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
        
        frameIdRef.current = requestAnimationFrame(animate);
        
        // Update camera position based on zoom
        if (cameraRef.current) {
          cameraRef.current.position.z = zoom;
        }
        
        // Get current time for animations
        const time = Date.now() * 0.001;
        
        // Animate electron orbits - electrons should follow the orbital rings
        electronsRef.current.forEach((orbit, index) => {
          if (orbit.userData && typeof orbit.userData.shellIndex === 'number') {
            const shellIndex = orbit.userData.shellIndex;
            const electronIndex = orbit.userData.electronIndex || 0;
            
            // Get the current time for animation
            const speed = 0.5 / (shellIndex + 1); // Inner electrons move faster
            const time = Date.now() * 0.001 * speed;
            const angle = time + (electronIndex * Math.PI * 2 / 8); // Spread electrons out
            
            // Get radius for this orbit
            const shellRadius = 1 + shellIndex * 0.8;
            
            // Update electron position to follow the orbital path
            // Find the first child which should be the electron
            const electron = orbit.children[0];
            if (electron) {
              electron.position.x = shellRadius * Math.cos(angle);
              electron.position.z = shellRadius * Math.sin(angle); // Use Z instead of Y for horizontal orbits
              electron.position.y = 0;
            }
            
            // If there's a glow effect as the second child, update it too
            const glow = orbit.children[1];
            if (glow) {
              glow.position.copy(electron.position);
            }
          }
        });
        
        // Animate shell rings
        shellsRef.current.forEach((shell, index) => {
          if (shell instanceof THREE.Mesh) {
            // Pulse shell opacity
            if (shell.material instanceof THREE.MeshBasicMaterial) {
              shell.material.opacity = 0.5 + Math.sin(time * 1.5 + index) * 0.2;
            }
          }
        });
        
        // Nucleus animation
        if (nucleusRef.current) {
          // Simple rotation
          nucleusRef.current.rotation.x += 0.002;
          nucleusRef.current.rotation.y += 0.005;
          
          // Dynamic pulsing effect
          const pulseFactor = 1 + Math.sin(time * 1.5) * 0.08;
          nucleusRef.current.scale.set(pulseFactor, pulseFactor, pulseFactor);
        }
        
        // Slowly rotate the scene if not dragging
        if (sceneRef.current && !isDragging.current) {
          sceneRef.current.rotation.y += 0.002;
        }
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } catch (error) {
        console.error("Animation error:", error);
        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
        }
      }
    };
    
    // Initialize the scene
    const init = () => {
      try {
        addLights();
        buildAtomModel();
        
        // Handle window resize
        const handleResize = () => {
          if (!cameraRef.current || !rendererRef.current) return;
          
          if (modelContainerRef.current) {
            const width = containerSize.width;
            const height = containerSize.height;
            
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            
            rendererRef.current.setSize(width, height);
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Start animation
        animate();
        setIsSceneReady(true);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          
          // Only remove listeners from the elements that still exist
          if (modelContainerRef.current) {
            modelContainerRef.current.removeEventListener('mousedown', handleMouseDown);
            modelContainerRef.current.removeEventListener('wheel', handleWheel);
            modelContainerRef.current.removeEventListener('touchstart', handleTouchStart);
            modelContainerRef.current.removeEventListener('touchmove', handleTouchMove);
          }
          
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('touchend', handleTouchEnd);
        };
      } catch (error) {
        console.error("Initialization error:", error);
        return undefined;
      }
    };
    
    const cleanup = init();
    
    // Clean up
    return () => {
      if (cleanup) cleanup();
      
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      
      // Don't try to manually remove the renderer in cleanup
      // React will handle this for us when the component unmounts
      
      // Dispose of resources in a safer way
      try {
        // Clear scene objects
        if (sceneRef.current) {
          // Remove all objects from the scene first
          while (sceneRef.current.children.length > 0) {
            const object = sceneRef.current.children[0];
            sceneRef.current.remove(object);
          }
        }
        
        // Dispose geometries and materials
        electronsRef.current.forEach(orbit => {
          orbit.traverse(object => {
            if (object instanceof THREE.Mesh) {
              if (object.geometry) object.geometry.dispose();
              
              if (Array.isArray(object.material)) {
                object.material.forEach(material => {
                  if (material) material.dispose();
                });
              } else if (object.material) {
                object.material.dispose();
              }
            }
          });
        });
        
        shellsRef.current.forEach(shell => {
          if (shell instanceof THREE.Mesh) {
            if (shell.geometry) shell.geometry.dispose();
            
            if (Array.isArray(shell.material)) {
              shell.material.forEach(material => {
                if (material) material.dispose();
              });
            } else if (shell.material) {
              shell.material.dispose();
            }
          }
        });
        
        // Dispose of nucleus
        if (nucleusRef.current) {
          if (nucleusRef.current.geometry) nucleusRef.current.geometry.dispose();
          
          if (Array.isArray(nucleusRef.current.material)) {
            nucleusRef.current.material.forEach(material => {
              if (material) material.dispose();
            });
          } else if (nucleusRef.current.material) {
            nucleusRef.current.material.dispose();
          }
        }
        
        // Dispose of renderer
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      } catch (error) {
        console.warn('Error disposing resources:', error);
      }
      
      // Clear references
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      electronsRef.current = [];
      shellsRef.current = [];
      nucleusRef.current = null;
    };
  }, [element, containerSize, zoom]);

  return (
    <div className="model-container-wrapper">
      <div 
        className="model-container" 
        ref={modelContainerRef}
        style={{ 
          width: containerSize.width, 
          height: containerSize.height 
        }}
      >
        {!isSceneReady && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading 3D Model...</div>
          </div>
        )}
        
        {isSceneReady && (
          <div className="controls">
            <button onClick={handleZoomIn} className="control-button">
              <ZoomIn size={18} />
            </button>
            <button onClick={handleZoomOut} className="control-button">
              <ZoomOut size={18} />
            </button>
            <button onClick={handleReset} className="control-button">
              <RotateCcw size={18} />
            </button>
          </div>
        )}
        
        {isSceneReady && (
          <div className="element-info">
            <div className="element-symbol">{element.symbol}</div>
            <div className="element-name">{element.name}</div>
          </div>
        )}
      </div>
      
      <style>{`
        .model-container-wrapper {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          background: #000000;
        }
        
        .model-container {
          border-radius: 8px;
          overflow: hidden;
          cursor: grab;
          position: relative;
        }
        
        .model-container:active {
          cursor: grabbing;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.8);
          z-index: 10;
          color: white;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #4a88ff;
          border-radius: 50%;
          animation: spin 1s ease-in-out infinite;
        }
        
        .loading-text {
          margin-top: 16px;
          font-size: 14px;
        }
        
        .controls {
          position: absolute;
          bottom: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
          z-index: 5;
        }
        
        .control-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .control-button:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .element-info {
          position: absolute;
          top: 16px;
          left: 16px;
          color: white;
          z-index: 5;
          user-select: none;
        }
        
        .element-symbol {
          font-size: 24px;
          font-weight: bold;
        }
        
        .element-name {
          font-size: 14px;
          opacity: 0.8;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ElementModel3D;