"use client";

import { DragEvent, useState, useRef, useEffect } from 'react';
import { Rive, Layout, EventType, Fit, Alignment, StateMachineInputType, StateMachineInput } from '@rive-app/react-canvas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/Tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./components/Select";
import { Label } from "./components/Label";
import { Switch } from "./components/Switch";
import { Input } from "./components/Input";
import { Button } from './components/Button';
import { Separator } from './components/Separator';
import { Toaster, toast } from "sonner";

import { Upload, Play, Pause, RefreshCw, Info, RotateCcw, AlertCircle, CheckCircle2, ArrowRight, Circle, ArrowLeft, ArrowUpRight, ArrowUp, ArrowUpLeft, ArrowDownLeft, ArrowDown, ArrowDownRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
enum PlayerState {
    Idle,
    Loading,
    Active,
    Error,
}

enum PlayerError {
    NoAnimation,
}

type BackgroundColor = 'transparent' | 'white' | 'black';

type AlignFitIndex = {
    alignment: number;
    fit: number;
};

type Dimensions = {
    width: number;
    height: number;
};

type Status = {
    current: PlayerState;
    hovering?: boolean;
    error?: PlayerError | null;
};

type RiveAnimations = {
    animations: string[];
    active: string;
};

type RiveStateMachines = {
    stateMachines: string[];
    active: string;
};

type RiveController = {
    active: "animations" | "state-machines";
};

type RiveInfo = {
    version: string;
    fileSize: number;
    fps: number | string;
    artboardCount: number;
};

type DebugLog = {
    id: string;
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'warning' | 'success';
};

const fitValues: (keyof typeof Fit)[] = [
    'Cover',
    'Contain',
    'Fill',
    'FitWidth',
    'FitHeight',
    'None',
    'ScaleDown',
];

const alignValues: (keyof typeof Alignment)[] = [
    'TopLeft',
    'TopCenter',
    'TopRight',
    'CenterLeft',
    'Center',
    'CenterRight',
    'BottomLeft',
    'BottomCenter',
    'BottomRight',
];

// Component
export default function RiveAnimationPlayer() {
    // References
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // File and status state
    const [status, setStatus] = useState<Status>({ current: PlayerState.Idle, hovering: false });
    const [filename, setFilename] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string | null>(null);
    const [riveAnimation, setRiveAnimation] = useState<Rive | null>(null);
    const [riveInfo, setRiveInfo] = useState<RiveInfo | null>(null);
    
    // Animation state
    const [animationList, setAnimationList] = useState<RiveAnimations | null>(null);
    const [stateMachineList, setStateMachineList] = useState<RiveStateMachines | null>(null);
    const [stateMachineInputs, setStateMachineInputs] = useState<StateMachineInput[]>([]);
    const [artboards, setArtboards] = useState<string[]>([]);
    const [selectedArtboard, setSelectedArtboard] = useState<string>('');

    // Player state
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [controller, setController] = useState<RiveController>({ active: "animations" });
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    const [background, setBackground] = useState<BackgroundColor>('transparent');
    const [alignFitIndex, setAlignFitIndex] = useState<AlignFitIndex>({
        alignment: alignValues.indexOf('Center'),
        fit: fitValues.indexOf('Cover'),
    });

    // Debug state
    const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
    const [isDebugPanelOpen, setIsDebugPanelOpen] = useState<boolean>(false);

    // Add to debug logs
    const addDebugLog = (message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        setDebugLogs(prev => [
            { id, timestamp, message, type },
            ...prev.slice(0, 49) // Keep only the last 50 logs
        ]);
    };

    // Rive animation event handlers
    useEffect(() => {
        if (!riveAnimation) return;

        const handleLoad = () => {
            getAnimationList();
            getStateMachineList();
            getArtboardList();
            setStatus({ current: PlayerState.Active, error: null });
            setControllerState(controller.active);
            addDebugLog('Rive animation loaded successfully', 'success');
        };

        const handleLoadError = () => {
            setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation });
            addDebugLog('Failed to load Rive animation', 'error');
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleStop = () => setIsPlaying(false);

        riveAnimation.on(EventType.Load, handleLoad);
        riveAnimation.on(EventType.LoadError, handleLoadError);
        riveAnimation.on(EventType.Play, handlePlay);
        riveAnimation.on(EventType.Pause, handlePause);
        riveAnimation.on(EventType.Stop, handleStop);

        return () => {
            if (riveAnimation) {
                riveAnimation.off(EventType.Load, handleLoad);
                riveAnimation.off(EventType.LoadError, handleLoadError);
                riveAnimation.off(EventType.Play, handlePlay);
                riveAnimation.off(EventType.Pause, handlePause);
                riveAnimation.off(EventType.Stop, handleStop);
            }
        };
    }, [riveAnimation]);

    // Handle status changes
    useEffect(() => {
        if (status.current === PlayerState.Error && status.error !== null) {
            reset();
            fireErrorToast();
        } else {
            if (status.current === PlayerState.Active && !animationList) { getAnimationList(); }
            if (status.current === PlayerState.Active && !stateMachineList) { getStateMachineList(); }
            if (status.current === PlayerState.Active && artboards.length === 0) { getArtboardList(); }
        }
    }, [status]);

    // Update layout when alignment or fit changes
    useEffect(() => {
        if (riveAnimation) {
            riveAnimation.layout = new Layout({
                fit: getFitValue(alignFitIndex),
                alignment: getAlignmentValue(alignFitIndex),
            });
        }
    }, [alignFitIndex]);

    // Handle canvas resizing
    useEffect(() => {
        if (canvasRef.current && dimensions && riveAnimation) {
            canvasRef.current.width = dimensions.width;
            canvasRef.current.height = dimensions.height;
            riveAnimation.resizeToCanvas();
        }
    }, [dimensions, riveAnimation]);

    // Initialize dimensions and add resize listener
    useEffect(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Update preview dimensions
    const updateDimensions = () => {
        const targetDimensions = previewRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
        if (targetDimensions.width === dimensions.width && targetDimensions.height === dimensions.height) return;
        setDimensions({ width: targetDimensions.width, height: targetDimensions.height });
    };

    // Toggle animation playback
    const togglePlayback = () => {
        const active = animationList?.active;
        if (active) {
            if (!isPlaying) {
                riveAnimation?.play(active);
                addDebugLog(`Playing animation: ${active}`, 'info');
            } else {
                riveAnimation?.pause(active);
                addDebugLog(`Paused animation: ${active}`, 'info');
            }
        }
    };

    // Load animation from buffer
    const setAnimationWithBuffer = (buffer: string | ArrayBuffer | null) => {
        if (!buffer) return;

        setStatus({ current: PlayerState.Loading });
        addDebugLog('Loading animation from buffer...', 'info');
        
        if (riveAnimation) {
            riveAnimation.load({
                buffer: buffer as ArrayBuffer,
                autoplay: true,
            });
            return;
        }

        try {
            setRiveAnimation(new Rive({
                buffer: buffer as ArrayBuffer,
                canvas: canvasRef.current!,
                autoplay: true,
                layout: new Layout({
                    fit: Fit.Cover,
                    alignment: Alignment.Center,
                }),
            }));
            setStatus({ current: PlayerState.Active });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            addDebugLog(`Error creating Rive instance: ${errorMessage}`, 'error');
            setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation });
        }
    };

    // Load file
    const load = (file: File) => {
        setFilename(file.name);
        const formattedSize = formatFileSize(file.size);
        setFileSize(formattedSize);
        
        addDebugLog(`File selected: ${file.name} (${formattedSize})`, 'info');
        
        const reader = new FileReader();
        reader.onload = () => {
            setAnimationWithBuffer(reader.result);
            
            // Set basic file info
            if (reader.result) {
                setRiveInfo({
                    version: "Unknown", // Will be updated when animation loads
                    fileSize: file.size,
                    fps: "Unknown",
                    artboardCount: 0,
                });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    // Reset all states
    const reset = () => {
        addDebugLog('Resetting Rive player', 'info');
        
        setIsPlaying(true);
        setFilename(null);
        setFileSize(null);
        setRiveAnimation(null);
        setAnimationList(null);
        setStateMachineList(null);
        setStateMachineInputs([]);
        setArtboards([]);
        setSelectedArtboard('');
        setRiveInfo(null);
        setStatus({ ...status, current: PlayerState.Idle });
        
        // Reset file input
        if (inputRef.current) {
            inputRef.current.value = '';
        }
        
        clearCanvas();
    };

    // Set controller state (animations or state machines)
    const setControllerState = (state: "animations" | "state-machines") => {
        addDebugLog(`Switching controller to: ${state}`, 'info');
        
        setController({
            ...controller,
            active: state,
        });

        if (state === "animations" && animationList) {
            setActiveAnimation(animationList.active);
        } else if (state === "state-machines" && stateMachineList) {
            setActiveStateMachine(stateMachineList.active);
        }
    };

    // Set active animation
    const setActiveAnimation = (animation: string) => {
        if (!riveAnimation) return;
        if (!animationList) return;

        addDebugLog(`Setting active animation: ${animation}`, 'info');
        
        clearCanvas();
        if (riveAnimation) {
            riveAnimation.stop(animationList?.active);
            setAnimationList({
                ...animationList,
                active: animation,
            });
            riveAnimation.play(animation);
        }
    };

    // Set active state machine
    const setActiveStateMachine = (stateMachine: string) => {
        if (!riveAnimation) return;
        if (!stateMachineList) return;

        addDebugLog(`Setting active state machine: ${stateMachine}`, 'info');
        
        clearCanvas();
        if (riveAnimation) {
            riveAnimation.stop(stateMachineList?.active);
            setStateMachineList({
                ...stateMachineList,
                active: stateMachine,
            });
            riveAnimation.play(stateMachine);
        }

        // Get inputs for this state machine
        const inputs = riveAnimation?.stateMachineInputs(stateMachine);
        setStateMachineInputs(inputs);
        
        if (inputs && inputs.length > 0) {
            addDebugLog(`Found ${inputs.length} inputs for state machine: ${stateMachine}`, 'info');
        } else {
            addDebugLog(`No inputs found for state machine: ${stateMachine}`, 'info');
        }
    };

    // Get list of animations
    const getAnimationList = () => {
        const animations = riveAnimation?.animationNames;
        if (!animations) return;

        setAnimationList({ animations, active: animations[0] });
        addDebugLog(`Found ${animations.length} animations: ${animations.join(', ')}`, 'info');
    };

    // Get list of state machines
    const getStateMachineList = () => {
        const stateMachines = riveAnimation?.stateMachineNames;
        if (!stateMachines) return;

        setStateMachineList({ stateMachines, active: stateMachines[0] });
        addDebugLog(`Found ${stateMachines.length} state machines: ${stateMachines.join(', ')}`, 'info');
    };

    // Get list of artboards
    const getArtboardList = () => {
        // This is a placeholder - actual implementation depends on the Rive API
        // For now, we'll just set a default artboard
        setArtboards(['Default']);
        setSelectedArtboard('Default');
        
        // Update riveInfo if we have it
        if (riveInfo) {
            setRiveInfo({
                ...riveInfo,
                artboardCount: 1,
                version: riveAnimation?.file?.version || 'Unknown',
                fps: riveAnimation?.fps || 'Unknown',
            });
        }
    };

    // Get Fit value from index
    const getFitValue = (alignFitIndex: AlignFitIndex) => {
        return Fit[fitValues[alignFitIndex.fit]];
    };

    // Get Alignment value from index
    const getAlignmentValue = (alignFitIndex: AlignFitIndex) => {
        return Alignment[alignValues[alignFitIndex.alignment]];
    };

    //icon based on button for alignment from lucide-react
    // Alignment icons from Lucide React
    const iconByAlignValues = [
      { value: 'TopLeft', icon: <ArrowUpLeft size={16} /> },
      { value: 'TopCenter', icon: <ArrowUp size={16} /> },
      { value: 'TopRight', icon: <ArrowUpRight size={16} /> },
      { value: 'CenterLeft', icon: <ArrowLeft size={16} /> },
      { value: 'Center', icon: <Circle size={16} /> },
      { value: 'CenterRight', icon: <ArrowRight size={16} /> },
      { value: 'BottomLeft', icon: <ArrowDownLeft size={16} /> },
      { value: 'BottomCenter', icon: <ArrowDown size={16} /> },
      { value: 'BottomRight', icon: <ArrowDownRight size={16} /> },
    ];

    const getAlignmentIcon = (alignment: string) => {
        const icon = iconByAlignValues.find((item) => item.value === alignment);
        return icon ? icon.icon : null;
    }

    // Handle state machine input change
    const handleInputChange = (input: StateMachineInput, value: boolean | number) => {
        if (!riveAnimation) return;
        
        try {
            addDebugLog(`Setting input ${input.name} (${input.type}) to ${value}`, 'info');
            
            switch (input.type) {
                case StateMachineInputType.Boolean:
                    input.value = value as boolean;
                    addDebugLog(`Set boolean input ${input.name} to ${value}`, 'success');
                    break;
                case StateMachineInputType.Number:
                    input.value = value as number;
                    addDebugLog(`Set number input ${input.name} to ${value}`, 'success');
                    break;
                case StateMachineInputType.Trigger:
                    input.fire();
                    addDebugLog(`Fired trigger input ${input.name}`, 'success');
                    break;
                default:
                    addDebugLog(`Unsupported input type: ${input.type}`, 'warning');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            addDebugLog(`Error setting input ${input.name}: ${errorMessage}`, 'error');
            toast.error(`Failed to update input: ${errorMessage}`);
        }
    };

    // Drag and drop handlers
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: true });
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: false });
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: true });
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: false });
        load(e.dataTransfer.files[0]);
        e.preventDefault();
        e.stopPropagation();
    };

    // Clear canvas
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        riveAnimation?.stop();
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // Display logic
    const shouldDisplayCanvas = () => [PlayerState.Active, PlayerState.Loading].includes(status.current);

    // Toast for errors
    const fireErrorToast = () => {
        toast.error("Your file has no animations.");
    };

    // Get log class based on type
    const getLogClass = (type: 'info' | 'error' | 'warning' | 'success') => {
        switch (type) {
            case 'error': return 'text-red-600';
            case 'warning': return 'text-yellow-600';
            case 'success': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    // Get log icon based on type
    const getLogIcon = (type: 'info' | 'error' | 'warning' | 'success') => {
        switch (type) {
            case 'error': return <AlertCircle size={16} className="text-red-600" />;
            case 'warning': return <AlertCircle size={16} className="text-yellow-600" />;
            case 'success': return <CheckCircle2 size={16} className="text-green-600" />;
            default: return <Info size={16} className="text-gray-600" />;
        }
    };

    // Component render functions
    const component_prompt = () => {
      return (
          <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50 bg-opacity-90 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: shouldDisplayCanvas() ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              style={{ display: shouldDisplayCanvas() ? 'none' : 'flex' }}
          >
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-gray-600 text-center">Drag and drop a Rive file or</p>
              <Button 
                  onClick={() => inputRef.current?.click()} 
                  className="flex items-center gap-2"
              >
                  <Upload size={16} />
                  Browse
              </Button>
              <input 
                  hidden 
                  type="file" 
                  accept=".riv" 
                  ref={inputRef}
                  onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                          const droppedFile = files[0];
                          load(droppedFile);
                      }
                  }}
              />
          </motion.div>
      );
  };

  const component_canvas = () => {
      return (
          <canvas 
              ref={canvasRef} 
              style={{ display: shouldDisplayCanvas() ? 'block' : 'none' }} 
              className={`${background === 'white' ? 'bg-white' : background === 'black' ? 'bg-black' : ''}`} 
          />
      );
  };

  const component_controlsCard = () => {
      return (
          <Card className="w-full overflow-hidden shadow-sm">
              <CardHeader className="bg-gray-50 pb-3">
                  <CardTitle className="text-lg">Controls</CardTitle>
                  <CardDescription>Interact with the animation</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4">
                  <Tabs 
                      value={controller.active}
                      className="w-full flex flex-col items-center"
                      onValueChange={(value) => setControllerState(value as "animations" | "state-machines")}
                  >
                      <TabsList className="grid w-full grid-cols-2 mb-2">
                          <TabsTrigger value="animations">Animations</TabsTrigger>
                          <TabsTrigger value="state-machines">State Machines</TabsTrigger>
                      </TabsList>
                      
                      {/* Animations Tab Content */}
                      <TabsContent value="animations" className="w-full">
                          {artboards.length > 1 && (
                              <div className="mb-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Artboard:</label>
                                  <div className="relative">
                                      <Select
                                          value={selectedArtboard}
                                          onValueChange={setSelectedArtboard}
                                      >
                                          <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select Artboard" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectGroup>
                                                  <SelectLabel>Available Artboards</SelectLabel>
                                                  {artboards.map((artboard) => (
                                                      <SelectItem key={artboard} value={artboard}>{artboard}</SelectItem>
                                                  ))}
                                              </SelectGroup>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                          )}
                          
                          <div className="w-full">
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                  {animationList?.animations.map((animation, index) => (
                                      <motion.li key={index} className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                          <Button
                                              variant={animationList.active === animation ? "default" : "outline"}
                                              onClick={() => setActiveAnimation(animation)}
                                              className="w-full"
                                              size="sm"
                                          >
                                              {animation}
                                          </Button>
                                      </motion.li>
                                  ))}
                              </ul>
                              
                              {animationList?.animations.length === 0 && (
                                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-center">
                                      <p className="text-gray-500 text-sm">No animations available</p>
                                  </div>
                              )}
                          </div>
                      </TabsContent>
                      
                      {/* State Machines Tab Content */}
                      <TabsContent value="state-machines" className="w-full flex flex-col items-center">
                          <Select
                              value={stateMachineList?.active}
                              onValueChange={(value) => setActiveStateMachine(value)}
                          >
                              <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select State Machine" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectGroup>
                                      <SelectLabel>Available State Machines</SelectLabel>
                                      {stateMachineList?.stateMachines.map((stateMachine) => (
                                          <SelectItem key={stateMachine} value={stateMachine}>{stateMachine}</SelectItem>
                                      ))}
                                  </SelectGroup>
                              </SelectContent>
                          </Select>
                          
                          {stateMachineList?.stateMachines.length === 0 && (
                              <div className="p-3 mt-2 bg-gray-50 rounded-md border border-gray-200 text-center w-full">
                                  <p className="text-gray-500 text-sm">No state machines available</p>
                              </div>
                          )}
                          
                          <div className="w-full mt-4">
                              {/* Trigger inputs */}
                              {stateMachineInputs?.some((input) => input.type === StateMachineInputType.Trigger) && (
                                  <>
                                      <h2 className="text-lg font-medium mb-2">Triggers</h2>
                                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                          {stateMachineInputs?.filter((input) => input.type === StateMachineInputType.Trigger).map((input, index) => (
                                              <motion.li key={index} className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                  <Button
                                                      variant="default"
                                                      onClick={() => handleInputChange(input, true)}
                                                      className="w-full"
                                                      size="sm"
                                                  >
                                                      {input.name}
                                                  </Button>
                                              </motion.li>
                                          ))}
                                      </ul>
                                  </>
                              )}
                              
                              {/* Boolean inputs */}
                              {stateMachineInputs.some((input) => input.type === StateMachineInputType.Boolean) && (
                                  <>
                                      <h2 className="text-lg font-medium mt-4 mb-2">Booleans</h2>
                                      <ul className="flex flex-col gap-2 w-full">
                                          {stateMachineInputs?.filter((input) => input.type === StateMachineInputType.Boolean).map((input, index) => (
                                              <li key={index} className="w-full">
                                                  <div className="flex items-center space-x-2">
                                                      <Switch 
                                                          id={input.name} 
                                                          onCheckedChange={(value) => {
                                                              handleInputChange(input, value);
                                                          }}
                                                      />
                                                      <Label htmlFor={input.name}>{input.name}</Label>
                                                  </div>
                                              </li>
                                          ))}
                                      </ul>
                                  </>
                              )}
                              
                              {/* Number inputs */}
                              {stateMachineInputs.some((input) => input.type === StateMachineInputType.Number) && (
                                  <>
                                      <h2 className="text-lg font-medium mt-4 mb-2">Numbers</h2>
                                      <ul className="flex flex-col gap-2 w-full">
                                          {stateMachineInputs?.filter((input) => input.type === StateMachineInputType.Number).map((input, index) => (
                                              <li key={index} className="w-full">
                                                  <div className="w-full">
                                                      <div className="flex justify-between items-center mb-1">
                                                          <Label htmlFor={input.name}>
                                                              {input.name}
                                                          </Label>
                                                          <span className="text-xs font-medium text-gray-500" id={`value-${input.name}`}>
                                                              0
                                                          </span>
                                                      </div>
                                                      <Input 
                                                          type="range"
                                                          id={input.name}
                                                          min="0"
                                                          max="100"
                                                          defaultValue="0"
                                                          onChange={(e) => {
                                                              const value = parseFloat(e.target.value);
                                                              if (document.getElementById(`value-${input.name}`)) {
                                                                  document.getElementById(`value-${input.name}`)!.textContent = value.toString();
                                                              }
                                                              handleInputChange(input, value);
                                                          }}
                                                          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                                      />
                                                  </div>
                                              </li>
                                          ))}
                                      </ul>
                                  </>
                              )}
                              
                              {stateMachineInputs.length === 0 && (
                                  <div className="p-3 mt-2 bg-gray-50 rounded-md border border-gray-200 text-center">
                                      <p className="text-gray-500 text-sm">No inputs available for this state machine</p>
                                  </div>
                              )}
                          </div>
                      </TabsContent>
                  </Tabs>
                  
                  {/* Play/Pause button for animations */}
                  {controller.active === "animations" && (
                      <>
                          <Separator orientation="horizontal" />
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                  onClick={togglePlayback}
                                  disabled={status.current !== PlayerState.Active}
                                  variant="secondary"
                                  className="w-full flex items-center justify-center gap-2"
                              >
                                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                  {status.current !== PlayerState.Active ? "Play/Pause" : isPlaying ? 'Pause' : 'Play'}
                              </Button>
                          </motion.div>
                      </>
                  )}
              </CardContent>
          </Card>
      );
  };

  const component_appearanceCard = () => {
      return (
          <Card className="w-full overflow-hidden shadow-sm">
              <CardHeader className="bg-gray-50 pb-3">
                  <CardTitle className="text-lg">Appearance</CardTitle>
                  <CardDescription>Customize the appearance</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                  <div className="w-full">
                      <h2 className="text-lg font-medium mb-2">Background Color</h2>
                      <Select
                          value={background}
                          onValueChange={(value) => setBackground(value as BackgroundColor)}
                      >
                          <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Background" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectGroup>
                                  <SelectLabel>Available Backgrounds</SelectLabel>
                                  <SelectItem value="transparent">Transparent</SelectItem>
                                  <SelectItem value="white">White</SelectItem>
                                  <SelectItem value="black">Black</SelectItem>
                              </SelectGroup>
                          </SelectContent>
                      </Select>
                  </div>
              </CardContent>
          </Card>
      );
  };

  const component_layoutCard = () => {
      return (
          <Card className="w-full overflow-hidden shadow-sm">
              <CardHeader className="bg-gray-50 pb-3">
                  <CardTitle className="text-lg">Layout</CardTitle>
                  <CardDescription>Adjust the layout of the animation</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                  <div className="w-full">
                      <div className="flex flex-row flex-wrap justify-between items-center gap-2 mb-2">
                          <h2 className="text-lg font-medium pr-4">Fit</h2>
                          <div className="w-auto min-w-40">
                              <Select
                                  value={fitValues[alignFitIndex.fit]}
                                  onValueChange={(value) => setAlignFitIndex({ ...alignFitIndex, fit: fitValues.indexOf(value as keyof typeof Fit) })}
                              >
                                  <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Fit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectGroup>
                                          <SelectLabel>Available Fits</SelectLabel>
                                          {fitValues.map((fit) => (
                                              <SelectItem key={fit} value={fit}>{fit}</SelectItem>
                                          ))}
                                      </SelectGroup>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                      <div className="flex flex-row justify-between flex-wrap">
                          <h2 className="text-lg font-medium mt-4 pr-4">Alignment</h2>
                          <div className="grid grid-rows-[36px_36px_36px] grid-cols-[36px_36px_36px] gap-2 mt-4 mb-2">
                              {alignValues.map((_, index) => (
                                  <motion.button
                                      key={`btn_${index}`}
                                      onClick={() => setAlignFitIndex({ ...alignFitIndex, alignment: index })}
                                      className={`w-[36px] h-[36px] ${alignFitIndex.alignment === index ? 'bg-foreground' : 'bg-muted'} hover:bg-secondary-foreground rounded-lg transition-colors border-2 border-gray-200 flex items-center justify-center`}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                  >
                                    {getAlignmentIcon(alignValues[index])}
                                  </motion.button>
                              ))}
                          </div>
                      </div>
                  </div>
              </CardContent>
          </Card>
      );
  };

  const component_fileInfoCard = () => {
      if (!filename || !riveInfo) return null;
      
      return (
          <motion.div 
              className="w-full mb-4 p-3 bg-blue-50 rounded-md shadow-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
          >
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-blue-800">
                  <div className="flex items-center">
                      <span className="font-medium mr-2">File:</span> 
                      {filename}
                  </div>
                  {riveInfo.version !== 'Unknown' && (
                      <div className="flex items-center">
                          <span className="font-medium mr-2">Rive Version:</span> 
                          {riveInfo.version}
                      </div>
                  )}
                  <div className="flex items-center">
                      <span className="font-medium mr-2">Size:</span> 
                      {fileSize}
                  </div>
                  {riveInfo.fps !== 'Unknown' && (
                      <div className="flex items-center">
                          <span className="font-medium mr-2">FPS:</span> 
                          {riveInfo.fps}
                      </div>
                  )}
                  {riveInfo.artboardCount > 0 && (
                      <div className="flex items-center">
                          <span className="font-medium mr-2">Artboards:</span> 
                          {riveInfo.artboardCount}
                      </div>
                  )}
              </div>
          </motion.div>
      );
  };

  const component_debugPanel = () => {
      return (
          <AnimatePresence>
              {isDebugPanelOpen && (
                  <motion.div
                      className="border-t border-gray-200 mt-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                  >
                      <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                          <h3 className="font-semibold text-gray-700">Debug Logs</h3>
                          <Button 
                              onClick={() => setDebugLogs([])}
                              variant="outline"
                              size="sm"
                              className="text-xs h-8"
                          >
                            <X size={16} />
                              Clear
                          </Button>
                      </div>
                      <div className="p-2 h-56 overflow-y-auto bg-gray-50 font-mono text-xs">
                          {debugLogs.length === 0 ? (
                              <p className="text-gray-400 p-2">No logs yet. Upload a file to see debug information.</p>
                          ) : (
                              <div className="space-y-1">
                                  {debugLogs.map(log => (
                                    <div 
                                        key={log.id} 
                                        className={`p-2 mb-1 rounded-md flex items-start border-l-4 ${
                                            log.type === 'error' ? 'bg-red-50 border-red-500' : 
                                            log.type === 'warning' ? 'bg-amber-50 border-amber-500' : 
                                            log.type === 'success' ? 'bg-green-50 border-green-500' : 
                                            'bg-blue-50 border-blue-500'
                                        }`}
                                    >
                                        <motion.div
                                            className="mr-2 mt-0.5 flex-shrink-0"
                                            initial={{ rotate: -10, scale: 0.8 }}
                                            animate={{ rotate: 0, scale: 1 }}
                                            transition={{ duration: 0.3, type: "spring" }}
                                        >
                                            {getLogIcon(log.type)}
                                        </motion.div>
                                        <motion.div 
                                            className="flex-grow"
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <span className={`text-xs font-mono font-medium ${
                                                log.type === 'error' ? 'text-red-600' : 
                                                log.type === 'warning' ? 'text-amber-600' : 
                                                log.type === 'success' ? 'text-green-600' : 
                                                'text-blue-600'
                                            } mr-2`}>[{log.timestamp}]</span>
                                            <span className={`text-sm ${getLogClass(log.type)}`}>{log.message}</span>
                                        </motion.div>
                                    </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
      );
  };

  // Main component render
return (
    <main className="flex-1 font-[family-name:var(--font-geist-sans)]">
        <Toaster richColors visibleToasts={10} />
        <div className="container px-4 md:px-8 mx-auto max-w-[1400px]">
            
            {/* Main content area */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] lg:gap-6 gap-4">
                {/* Left column - Preview */}
                <Card className="order-2 lg:order-1 overflow-hidden shadow-md">
                    <CardHeader className="bg-gray-50 pb-3 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl">Preview</CardTitle>
                                <CardDescription className="mt-1">
                                    {filename ? (
                                        <span>
                                            {filename}
                                            <span className="inline-block min-w-2">&nbsp;</span>
                                            <span className="text-muted-foreground">({fileSize})</span>
                                        </span>
                                    ) : (
                                        'Choose a file to get started'
                                    )}
                                </CardDescription>
                            </div>
                            
                            {/* Quick actions on the right */}
                            {filename && (
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={togglePlayback}
                                        disabled={status.current !== PlayerState.Active}
                                        className="hidden sm:flex items-center gap-1"
                                    >
                                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={reset}
                                        className="hidden sm:flex items-center gap-1"
                                    >
                                        <RotateCcw size={16} />
                                        Reset
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {component_fileInfoCard()}
                        
                        {/* Canvas container - make it bigger and more prominent */}
                        <div
                            ref={previewRef}
                            className={`relative w-full h-[60vh] min-h-[400px] overflow-hidden transition-colors ${status.hovering ? 'border-2 border-blue-500' : ''}`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                        >
                            {component_canvas()}
                            
                            {/* Add a subtle pattern to the empty state for better visual feedback */}
                            {!shouldDisplayCanvas() && (
                                <div className="absolute inset-0 bg-gray-50 bg-opacity-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
                            )}
                            
                            {component_prompt()}
                            
                            {/* Loading indicator */}
                            {status.current === PlayerState.Loading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-40 backdrop-blur-sm">
                                    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center space-y-3">
                                        <motion.div 
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="p-2"
                                        >
                                            <RefreshCw className="w-8 h-8 text-blue-500" />
                                        </motion.div>
                                        <span className="text-gray-700 font-medium">Loading animation...</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Error message with better positioning */}
                            {status.error && (
                                <motion.div 
                                    className="absolute top-4 left-4 right-4 p-4 bg-red-50 border border-red-200 rounded-md shadow-md"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-start">
                                        <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                                        <div>
                                            <p className="text-red-800 font-medium text-base">Error Loading Animation</p>
                                            <p className="text-red-700 mt-1">
                                                {status.error === PlayerError.NoAnimation ? 
                                                    "The uploaded file doesn't contain any animations." : 
                                                    "An error occurred while loading the animation."}
                                            </p>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={reset}
                                                className="mt-2 bg-white"
                                            >
                                                Try Again
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                        
                        {/* Mobile controls for small screens */}
                        <div className="lg:hidden flex justify-between items-center p-4 border-t">
                            <div className="flex gap-2">
                                {filename && (
                                    <>
                                        <Button 
                                            variant="secondary" 
                                            size="sm"
                                            onClick={togglePlayback}
                                            disabled={status.current !== PlayerState.Active}
                                        >
                                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            size="sm"
                                            onClick={reset}
                                        >
                                            <RotateCcw size={16} />
                                        </Button>
                                    </>
                                )}
                            </div>
                            
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
                                className="flex items-center gap-1"
                            >
                                <Info size={16} />
                                {isDebugPanelOpen ? 'Hide Debug' : 'Show Debug'}
                            </Button>
                        </div>
                        
                        {component_debugPanel()}
                    </CardContent>
                </Card>
                
                {/* Right column - Controls with sticky positioning */}
                <div className="order-1 lg:order-2 flex flex-col gap-4 lg:sticky lg:top-4 self-start">
                    {/* Control group tabs for organized UI */}
                    <Tabs defaultValue="controls" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 mb-4">
                            <TabsTrigger value="controls">Controls</TabsTrigger>
                            <TabsTrigger value="appearance">Appearance</TabsTrigger>
                            <TabsTrigger value="layout">Layout</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="controls">
                            {component_controlsCard()}
                        </TabsContent>
                        
                        <TabsContent value="appearance">
                            {component_appearanceCard()}
                        </TabsContent>
                        
                        <TabsContent value="layout">
                            {component_layoutCard()}
                        </TabsContent>
                    </Tabs>
                    
                    {/* Debug panel toggle - desktop only */}
                    <div className="hidden lg:block">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
                            className="w-full flex items-center justify-center gap-1"
                        >
                            <Info size={16} />
                            {isDebugPanelOpen ? 'Hide Debug Panel' : 'Show Debug Panel'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </main>
);
}