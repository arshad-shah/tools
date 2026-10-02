'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';
import {
  Alignment,
  EventType,
  Fit,
  Layout,
  Rive,
  StateMachineInput,
  StateMachineInputType,
} from '@rive-app/react-canvas';
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowDownLeft,
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowUpLeft,
  IconArrowUpRight,
  IconCheckCircle2,
  IconCircle,
  IconInfo,
  IconPause,
  IconPlay,
  IconRotateCcw,
  IconX,
} from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Container,
  FileUpload,
  Grid,
  Heading,
  IconButton,
  Inline,
  Label,
  Select,
  Slider,
  Spinner,
  Stack,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import { assertRiveFile } from './lib/rive-file';
import {
  PlayerError,
  PlayerState,
  type AlignFitIndex,
  type BackgroundColor,
  type DebugLog,
  type Dimensions,
  type RiveAnimations,
  type RiveController,
  type RiveInfo,
  type RiveStateMachines,
  type Status,
} from './types';

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

const alignmentIcon: Record<string, React.ReactNode> = {
  TopLeft: <IconArrowUpLeft size="sm" />,
  TopCenter: <IconArrowUp size="sm" />,
  TopRight: <IconArrowUpRight size="sm" />,
  CenterLeft: <IconArrowLeft size="sm" />,
  Center: <IconCircle size="sm" />,
  CenterRight: <IconArrowRight size="sm" />,
  BottomLeft: <IconArrowDownLeft size="sm" />,
  BottomCenter: <IconArrowDown size="sm" />,
  BottomRight: <IconArrowDownRight size="sm" />,
};

export default function RiveAnimationPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<Status>({
    current: PlayerState.Idle,
    hovering: false,
  });
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [riveAnimation, setRiveAnimation] = useState<Rive | null>(null);
  const [riveInfo, setRiveInfo] = useState<RiveInfo | null>(null);

  const [animationList, setAnimationList] = useState<RiveAnimations | null>(
    null,
  );
  const [stateMachineList, setStateMachineList] =
    useState<RiveStateMachines | null>(null);
  const [stateMachineInputs, setStateMachineInputs] = useState<
    StateMachineInput[]
  >([]);
  const [artboards, setArtboards] = useState<string[]>([]);
  const [selectedArtboard, setSelectedArtboard] = useState<string>('');

  const [isPlaying, setIsPlaying] = useState(true);
  const [controller, setController] = useState<RiveController>({
    active: 'animations',
  });
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });
  const [background, setBackground] = useState<BackgroundColor>('transparent');
  const [alignFitIndex, setAlignFitIndex] = useState<AlignFitIndex>({
    alignment: alignValues.indexOf('Center'),
    fit: fitValues.indexOf('Cover'),
  });

  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [numberValues, setNumberValues] = useState<Record<string, number>>({});
  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>(
    {},
  );
  const [settingsTab, setSettingsTab] = useState('controls');

  const addDebugLog = (
    message: string,
    type: 'info' | 'error' | 'warning' | 'success' = 'info',
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    setDebugLogs((prev) => [
      { id, timestamp, message, type },
      ...prev.slice(0, 49),
    ]);
  };

  const getAnimationList = () => {
    const animations = riveAnimation?.animationNames;
    if (!animations) return;
    setAnimationList({ animations, active: animations[0] });
    addDebugLog(
      `Found ${animations.length} animations: ${animations.join(', ')}`,
      'info',
    );
  };

  const getStateMachineList = () => {
    const stateMachines = riveAnimation?.stateMachineNames;
    if (!stateMachines) return;
    setStateMachineList({ stateMachines, active: stateMachines[0] });
    addDebugLog(
      `Found ${stateMachines.length} state machines: ${stateMachines.join(', ')}`,
      'info',
    );
  };

  const getArtboardList = () => {
    setArtboards(['Default']);
    setSelectedArtboard('Default');
    if (riveInfo) {
      setRiveInfo({
        ...riveInfo,
        artboardCount: 1,
        version: 'Unknown',
        fps: riveAnimation?.fps || 'Unknown',
      });
    }
  };

  const getFitValue = (idx: AlignFitIndex) => Fit[fitValues[idx.fit]];
  const getAlignmentValue = (idx: AlignFitIndex) =>
    Alignment[alignValues[idx.alignment]];

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    riveAnimation?.stop();
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

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
    clearCanvas();
  };

  const setControllerState = (state: 'animations' | 'state-machines') => {
    addDebugLog(`Switching controller to: ${state}`, 'info');
    setController({ ...controller, active: state });
    if (state === 'animations' && animationList) {
      setActiveAnimation(animationList.active);
    } else if (state === 'state-machines' && stateMachineList) {
      setActiveStateMachine(stateMachineList.active);
    }
  };

  const setActiveAnimation = (animation: string) => {
    if (!riveAnimation || !animationList) return;
    addDebugLog(`Setting active animation: ${animation}`, 'info');
    clearCanvas();
    riveAnimation.stop(animationList.active);
    setAnimationList({ ...animationList, active: animation });
    riveAnimation.play(animation);
  };

  const setActiveStateMachine = (stateMachine: string) => {
    if (!riveAnimation || !stateMachineList) return;
    addDebugLog(`Setting active state machine: ${stateMachine}`, 'info');
    clearCanvas();
    riveAnimation.stop(stateMachineList.active);
    setStateMachineList({ ...stateMachineList, active: stateMachine });
    riveAnimation.play(stateMachine);
    const inputs = riveAnimation.stateMachineInputs(stateMachine);
    setStateMachineInputs(inputs ?? []);
    if (inputs && inputs.length > 0) {
      addDebugLog(
        `Found ${inputs.length} inputs for state machine: ${stateMachine}`,
        'info',
      );
    }
  };

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
      riveAnimation.off(EventType.Load, handleLoad);
      riveAnimation.off(EventType.LoadError, handleLoadError);
      riveAnimation.off(EventType.Play, handlePlay);
      riveAnimation.off(EventType.Pause, handlePause);
      riveAnimation.off(EventType.Stop, handleStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riveAnimation]);

  useEffect(() => {
    if (status.current === PlayerState.Error && status.error !== null) {
      reset();
      notify.error('Your file has no animations.');
    } else if (status.current === PlayerState.Active) {
      if (!animationList) getAnimationList();
      if (!stateMachineList) getStateMachineList();
      if (artboards.length === 0) getArtboardList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (riveAnimation) {
      riveAnimation.layout = new Layout({
        fit: getFitValue(alignFitIndex),
        alignment: getAlignmentValue(alignFitIndex),
      });
    }
  }, [alignFitIndex, riveAnimation]);

  const updateDimensions = () => {
    const rect =
      previewRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
    if (rect.width === dimensions.width && rect.height === dimensions.height)
      return;
    setDimensions({ width: rect.width, height: rect.height });
  };

  useEffect(() => {
    if (canvasRef.current && dimensions && riveAnimation) {
      canvasRef.current.width = dimensions.width;
      canvasRef.current.height = dimensions.height;
      riveAnimation.resizeToCanvas();
    }
  }, [dimensions, riveAnimation]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlayback = () => {
    const active = animationList?.active;
    if (active && riveAnimation) {
      if (!isPlaying) {
        riveAnimation.play(active);
        addDebugLog(`Playing animation: ${active}`, 'info');
      } else {
        riveAnimation.pause(active);
        addDebugLog(`Paused animation: ${active}`, 'info');
      }
    }
  };

  const setAnimationWithBuffer = (buffer: string | ArrayBuffer | null) => {
    if (!buffer) return;
    setStatus({ current: PlayerState.Loading });
    addDebugLog('Loading animation from buffer...', 'info');
    if (riveAnimation) {
      riveAnimation.load({ buffer: buffer as ArrayBuffer, autoplay: true });
      return;
    }
    try {
      setRiveAnimation(
        new Rive({
          buffer: buffer as ArrayBuffer,
          canvas: canvasRef.current!,
          autoplay: true,
          layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
        }),
      );
      setStatus({ current: PlayerState.Active });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      addDebugLog(`Error creating Rive instance: ${msg}`, 'error');
      setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation });
    }
  };

  const loadJob = useJob(async (_ctx, file: File) => {
    try {
      const bytes = await readBytes(file);
      assertRiveFile(file.name, bytes);
      return bytes;
    } catch (e) {
      const error = toToolError(e, `Couldn't read ${file.name}`);
      notify.error(error);
      addDebugLog(error.message, 'error');
      throw error;
    }
  });
  const load = async (file: File) => {
    const sz = formatBytes(file.size);
    addDebugLog(`File selected: ${file.name} (${sz})`, 'info');
    const bytes = await loadJob.run(file);
    if (!bytes) return; // already reported by the job
    setFilename(file.name);
    setFileSize(sz);
    // readBytes returns a view over a whole, fresh ArrayBuffer.
    setAnimationWithBuffer(bytes.buffer as ArrayBuffer);
    setRiveInfo({
      version: 'Unknown',
      fileSize: file.size,
      fps: 'Unknown',
      artboardCount: 0,
    });
  };

  const handleInputChange = (
    input: StateMachineInput,
    value: boolean | number,
  ) => {
    if (!riveAnimation) return;
    try {
      addDebugLog(
        `Setting input ${input.name} (${input.type}) to ${value}`,
        'info',
      );
      switch (input.type) {
        case StateMachineInputType.Boolean:
          input.value = value as boolean;
          addDebugLog(`Set boolean input ${input.name} to ${value}`, 'success');
          break;
        case StateMachineInputType.Number:
          input.value = value as number;
          setNumberValues((prev) => ({
            ...prev,
            [input.name]: value as number,
          }));
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
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addDebugLog(`Error setting input ${input.name}: ${msg}`, 'error');
      notify.error(`Failed to update input: ${msg}`);
    }
  };

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
    if (e.dataTransfer.files[0]) void load(e.dataTransfer.files[0]);
    e.preventDefault();
    e.stopPropagation();
  };

  const shouldDisplayCanvas = () =>
    [PlayerState.Active, PlayerState.Loading].includes(status.current);

  const logColorScheme = (
    type: DebugLog['type'],
  ): 'danger' | 'warning' | 'success' | 'accent' =>
    type === 'error'
      ? 'danger'
      : type === 'warning'
        ? 'warning'
        : type === 'success'
          ? 'success'
          : 'accent';

  const logIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'error':
        return <IconAlertCircle size="sm" />;
      case 'warning':
        return <IconAlertCircle size="sm" />;
      case 'success':
        return <IconCheckCircle2 size="sm" />;
      default:
        return <IconInfo size="sm" />;
    }
  };

  const renderControlsTab = () => (
    <Stack gap="4">
      <Tabs
        value={controller.active}
        onValueChange={(v) =>
          setControllerState(v as 'animations' | 'state-machines')
        }
        variant="soft"
        fullWidth
      >
        <TabsList aria-label="Controller">
          <TabsTrigger value="animations">Animations</TabsTrigger>
          <TabsTrigger value="state-machines">State machines</TabsTrigger>
        </TabsList>

        <TabsContent value="animations">
          <Stack gap="3" className="pt-3">
            {artboards.length > 1 && (
              <Stack gap="2">
                <Label>Artboard</Label>
                <Select
                  value={selectedArtboard}
                  onValueChange={setSelectedArtboard}
                  items={artboards.map((a) => ({ value: a, label: a }))}
                  aria-label="Artboard"
                />
              </Stack>
            )}
            {animationList && animationList.animations.length > 0 ? (
              <Grid max={2} gap="2">
                {animationList.animations.map((animation) => (
                  <Button
                    key={animation}
                    variant={
                      animationList.active === animation ? 'solid' : 'soft'
                    }
                    size="sm"
                    onClick={() => setActiveAnimation(animation)}
                    fullWidth
                  >
                    {animation}
                  </Button>
                ))}
              </Grid>
            ) : (
              <Alert status="info">
                <AlertDescription>No animations available.</AlertDescription>
              </Alert>
            )}
          </Stack>
        </TabsContent>

        <TabsContent value="state-machines">
          <Stack gap="3" className="pt-3">
            {stateMachineList && stateMachineList.stateMachines.length > 0 ? (
              <Stack gap="2">
                <Label>Active state machine</Label>
                <Select
                  value={stateMachineList.active}
                  onValueChange={setActiveStateMachine}
                  items={stateMachineList.stateMachines.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  aria-label="State machine"
                />
              </Stack>
            ) : (
              <Alert status="info">
                <AlertDescription>
                  No state machines available.
                </AlertDescription>
              </Alert>
            )}

            {stateMachineInputs.some(
              (i) => i.type === StateMachineInputType.Trigger,
            ) && (
              <Stack gap="2">
                <Heading level={4} size="sm">
                  Triggers
                </Heading>
                <Grid max={2} gap="2">
                  {stateMachineInputs
                    .filter((i) => i.type === StateMachineInputType.Trigger)
                    .map((input) => (
                      <Button
                        key={input.name}
                        variant="solid"
                        size="sm"
                        onClick={() => handleInputChange(input, true)}
                        fullWidth
                      >
                        {input.name}
                      </Button>
                    ))}
                </Grid>
              </Stack>
            )}

            {stateMachineInputs.some(
              (i) => i.type === StateMachineInputType.Boolean,
            ) && (
              <Stack gap="2">
                <Heading level={4} size="sm">
                  Booleans
                </Heading>
                <Stack gap="2">
                  {stateMachineInputs
                    .filter((i) => i.type === StateMachineInputType.Boolean)
                    .map((input) => (
                      <Inline key={input.name} align="center" gap="2">
                        <Switch
                          id={input.name}
                          checked={booleanValues[input.name] ?? false}
                          onCheckedChange={(v) => {
                            setBooleanValues((prev) => ({
                              ...prev,
                              [input.name]: v,
                            }));
                            handleInputChange(input, v);
                          }}
                          aria-label={input.name}
                        />
                        <Label htmlFor={input.name}>{input.name}</Label>
                      </Inline>
                    ))}
                </Stack>
              </Stack>
            )}

            {stateMachineInputs.some(
              (i) => i.type === StateMachineInputType.Number,
            ) && (
              <Stack gap="2">
                <Heading level={4} size="sm">
                  Numbers
                </Heading>
                <Stack gap="3">
                  {stateMachineInputs
                    .filter((i) => i.type === StateMachineInputType.Number)
                    .map((input) => (
                      <Stack key={input.name} gap="2">
                        <Inline justify="between" align="center">
                          <Label>{input.name}</Label>
                          <Badge variant="soft" tone="neutral" size="sm">
                            {numberValues[input.name] ?? 0}
                          </Badge>
                        </Inline>
                        <Slider
                          value={numberValues[input.name] ?? 0}
                          onValueChange={(v) => handleInputChange(input, v)}
                          min={0}
                          max={100}
                          aria-label={input.name}
                        />
                      </Stack>
                    ))}
                </Stack>
              </Stack>
            )}

            {stateMachineInputs.length === 0 && stateMachineList && (
              <Alert status="info">
                <AlertDescription>
                  No inputs available for this state machine.
                </AlertDescription>
              </Alert>
            )}
          </Stack>
        </TabsContent>
      </Tabs>

      {controller.active === 'animations' && (
        <Button
          variant="soft"
          fullWidth
          disabled={status.current !== PlayerState.Active}
          leftIcon={
            isPlaying ? <IconPause size="sm" /> : <IconPlay size="sm" />
          }
          onClick={togglePlayback}
        >
          {status.current !== PlayerState.Active
            ? 'Play / Pause'
            : isPlaying
              ? 'Pause'
              : 'Play'}
        </Button>
      )}
    </Stack>
  );

  const renderAppearanceTab = () => (
    <Stack gap="3">
      <Stack gap="2">
        <Label>Background colour</Label>
        <Select
          value={background}
          onValueChange={(v) => setBackground(v as BackgroundColor)}
          items={[
            { value: 'transparent', label: 'Transparent' },
            { value: 'white', label: 'White' },
            { value: 'black', label: 'Black' },
          ]}
          aria-label="Background"
        />
      </Stack>
    </Stack>
  );

  const renderLayoutTab = () => (
    <Stack gap="4">
      <Stack gap="2">
        <Label>Fit</Label>
        <Select
          value={fitValues[alignFitIndex.fit]}
          onValueChange={(v) =>
            setAlignFitIndex({
              ...alignFitIndex,
              fit: fitValues.indexOf(v as keyof typeof Fit),
            })
          }
          items={fitValues.map((f) => ({ value: f, label: f }))}
          aria-label="Fit"
        />
      </Stack>
      <Stack gap="2">
        <Label>Alignment</Label>
        <Grid cols={3} gap="2">
          {alignValues.map((value, idx) => (
            <IconButton
              key={value}
              variant={alignFitIndex.alignment === idx ? 'solid' : 'soft'}
              size="md"
              label={value}
              icon={alignmentIcon[value]}
              onClick={() =>
                setAlignFitIndex({ ...alignFitIndex, alignment: idx })
              }
            />
          ))}
        </Grid>
      </Stack>
    </Stack>
  );

  const renderDebugPanel = () =>
    isDebugPanelOpen ? (
      <Card>
        <CardHeader>
          <Inline justify="between" align="center">
            <CardTitle as="h4">Debug logs</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<IconX size="sm" />}
              onClick={() => setDebugLogs([])}
            >
              Clear
            </Button>
          </Inline>
        </CardHeader>
        <CardBody>
          <Box className="max-h-64 overflow-auto">
            {debugLogs.length === 0 ? (
              <Text size="sm" tone="subtle">
                No logs yet. Upload a file to see debug information.
              </Text>
            ) : (
              <Stack gap="1">
                {debugLogs.map((log) => (
                  <Card key={log.id}>
                    <CardBody>
                      <Inline gap="2" align="center">
                        {logIcon(log.type)}
                        <Badge
                          variant="soft"
                          tone={logColorScheme(log.type)}
                          size="xs"
                        >
                          {log.timestamp}
                        </Badge>
                        <Text size="xs">{log.message}</Text>
                      </Inline>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </CardBody>
      </Card>
    ) : null;

  return (
    <Container size="full">
      <Grid max={3} gap="4">
        <Box className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Inline justify="between" align="center" wrap gap="2">
                <Stack gap="0">
                  <CardTitle as="h3">Preview</CardTitle>
                  <Text size="sm" tone="subtle">
                    {filename ? (
                      <>
                        {filename}
                        {fileSize && (
                          <>
                            {' '}
                            <Text as="span" size="sm" tone="subtle">
                              ({fileSize})
                            </Text>
                          </>
                        )}
                      </>
                    ) : (
                      'Choose a file to get started'
                    )}
                  </Text>
                </Stack>
                {filename && (
                  <Inline gap="2">
                    <Button
                      variant="soft"
                      size="sm"
                      leftIcon={
                        isPlaying ? (
                          <IconPause size="sm" />
                        ) : (
                          <IconPlay size="sm" />
                        )
                      }
                      disabled={status.current !== PlayerState.Active}
                      onClick={togglePlayback}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      variant="soft"
                      size="sm"
                      leftIcon={<IconRotateCcw size="sm" />}
                      onClick={reset}
                    >
                      Reset
                    </Button>
                  </Inline>
                )}
              </Inline>
            </CardHeader>
            <CardBody>
              <Stack gap="3">
                {filename && riveInfo && (
                  <Inline gap="2" wrap>
                    <Badge variant="soft" tone="accent" size="sm">
                      File: {filename}
                    </Badge>
                    {fileSize && (
                      <Badge variant="soft" tone="accent" size="sm">
                        Size: {fileSize}
                      </Badge>
                    )}
                    {riveInfo.artboardCount > 0 && (
                      <Badge variant="soft" tone="accent" size="sm">
                        Artboards: {riveInfo.artboardCount}
                      </Badge>
                    )}
                  </Inline>
                )}

                <Card className={status.hovering ? 'border-accent' : undefined}>
                  <CardBody>
                    <div
                      ref={previewRef}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      className="relative h-[60vh] min-h-[400px] w-full overflow-hidden rounded-lg"
                    >
                      <canvas
                        ref={canvasRef}
                        className={cn(
                          shouldDisplayCanvas() ? 'block' : 'hidden',
                          background === 'white'
                            ? 'bg-white'
                            : background === 'black'
                              ? 'bg-black'
                              : 'bg-transparent',
                        )}
                      />

                      {!shouldDisplayCanvas() && (
                        <Center className="absolute inset-0 p-4">
                          <div
                            className="w-full max-w-sm"
                            onDrop={(e) => e.stopPropagation()}
                          >
                            <FileUpload
                              onFiles={(files) => {
                                if (files[0]) void load(files[0]);
                              }}
                              accept=".riv"
                              label="Drag and drop a Rive file, or click to browse"
                            />
                          </div>
                        </Center>
                      )}

                      {status.current === PlayerState.Loading && (
                        <Center className="absolute inset-0 bg-black/40">
                          <Stack gap="3" align="center">
                            <Spinner size="lg" />
                            <Text
                              size="sm"
                              weight="medium"
                              className="text-white"
                            >
                              Loading animation…
                            </Text>
                          </Stack>
                        </Center>
                      )}
                    </div>
                  </CardBody>
                </Card>

                {status.error && (
                  <Alert status="danger">
                    <AlertTitle>Error loading animation</AlertTitle>
                    <AlertDescription>
                      {status.error === PlayerError.NoAnimation
                        ? "The uploaded file doesn't contain any animations."
                        : 'An error occurred while loading the animation.'}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="soft"
                  size="sm"
                  leftIcon={<IconInfo size="sm" />}
                  onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
                  fullWidth
                >
                  {isDebugPanelOpen ? 'Hide debug panel' : 'Show debug panel'}
                </Button>

                {renderDebugPanel()}
              </Stack>
            </CardBody>
          </Card>
        </Box>

        <Card>
          <CardBody>
            <Tabs
              value={settingsTab}
              onValueChange={setSettingsTab}
              variant="line"
            >
              <TabsList aria-label="Settings">
                <TabsTrigger value="controls">Controls</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              <TabsContent value="controls">
                <Box className="pt-3">{renderControlsTab()}</Box>
              </TabsContent>
              <TabsContent value="appearance">
                <Box className="pt-3">{renderAppearanceTab()}</Box>
              </TabsContent>
              <TabsContent value="layout">
                <Box className="pt-3">{renderLayoutTab()}</Box>
              </TabsContent>
            </Tabs>
          </CardBody>
        </Card>
      </Grid>
    </Container>
  );
}
