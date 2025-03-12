import React, {
  useRef,
  useEffect,
  MouseEvent,
  WheelEvent,
  useState,
} from "react";
import { Slider, SliderSingleProps } from "antd";
import styles from "../styles/SolarSystem.module.scss";
import cosmos from "../assets/images/cosmos.jpg";
import earth from "../assets/images/earth.png";
import sky from "../assets/images/sky2.jpg";
import rocketStation from "../assets/images/rocketStation.png";
import rocket from "../assets/images/rocket.png";
import rocketPart from "../assets/images/rocket-part.png";
import rocketPart1 from "../assets/images/rocket-part1.png";
import rocketPart2 from "../assets/images/rocket-part2.png";
import rocketPart3 from "../assets/images/rocket-part3.png";
import rocketPart4 from "../assets/images/rocket-part4.png";
import rocketPart5 from "../assets/images/rocket-part5.png";
import rocketPart6 from "../assets/images/rocket-part6.png";
import moon from "../assets/images/moon.png";
import startMusic from "../assets/audio/music/MetroidBrinstarOrchestral.opus";
import thrusterSFX from "../assets/audio/sfx/Thruster.opus";
import clickSFX from "../assets/audio/sfx/click.opus";
import pressStartSFX from "../assets/audio/sfx/pressStart.opus";
import restartSimSFX from "../assets/audio/sfx/restartSimulation.opus";
import soundOffSFX from "../assets/audio/sfx/soundOff.opus";
import soundOnSFX from "../assets/audio/sfx/soundOn.opus";
import simPlaySFX from "../assets/audio/sfx/simPlay.opus";
import simStopSFX from "../assets/audio/sfx/simStop.opus";
import takeOffSFX from "../assets/audio/sfx/takeOff.opus";
import stageAwaySFX from "../assets/audio/sfx/stageAway.opus";
import setPresetSFX from "../assets/audio/sfx/setPreset.opus";
import countdown from "../assets/audio/sfx/Countdown.opus";
import beforeStart from "../assets/audio/music/MetroidPrime2TorvusBogSubterraneanTheme.opus";
import titleMusic from "../assets/audio/music/Metroid PrimePhendranaDriftsArrangement.opus";
import gameOverMusic from "../assets/audio/music/MetroidTitleThemeGameOver.opus";
import victoryMusic from "../assets/audio/music/MetroidTitleThemeVictory.opus";
import explosionMeme from "../assets/video/explosionMeme.mp4";
import moonLanding from "../assets/video/firstMoonLanding.mp4";
import InitialParameter from "./InitialParameter.tsx";
import sun from "../assets/images/sun.png";
import TitleMenu from "./TitleMenu.tsx";

const titleTrack = new Audio();
titleTrack.src = titleMusic;
titleTrack.loop = true;
const gameOverTrack = new Audio();
gameOverTrack.src = gameOverMusic;
gameOverTrack.loop = true;
const musicTrack = new Audio();
musicTrack.src = startMusic;
musicTrack.loop = true;
const beforeStartTrack = new Audio();
beforeStartTrack.src = beforeStart;
beforeStartTrack.loop = true;

const audioContext = new AudioContext();

export function playSound(src: string, volume: number = 1) {
  fetch(src)
    .then((response) => response.arrayBuffer())
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.value = volume; // Control volume safely
      source.start();
    })
    .catch(console.error);
}

const G = 6.674e-11; // Gravitational constant
const AU = 1.496e11; // 1 AU in meters
const SCALE = 200 / AU; // Scale for visualization
const realTime = 0.0166666667;
const zoomMin = -1000,
  zoomMax = 27800;
const maxThrusterVolume = 0.3;

const toDegrees = (degree: number) => (degree * 180) / Math.PI;

const toRadians = (degree: number) => degree * (Math.PI / 180);

const distance = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

const clamp = (num: number, min: number, max: number): number =>
  Math.min(Math.max(num, min), max);

const fadeOutAudio = (audio: HTMLAudioElement) => {
  if (audio.volume !== 0) {
    audio.volume = clamp(audio.volume - 0.01, 0, maxThrusterVolume);
    setTimeout(fadeOutAudio, 10, audio);
    return;
  }
  audio.pause();
};

const fadeInAudio = (audio: HTMLAudioElement) => {
  if (audio.volume !== maxThrusterVolume) {
    audio.volume = clamp(audio.volume + 0.01, 0, maxThrusterVolume);
    setTimeout(fadeInAudio, 10, audio);
  }
};

const scalarFromVector = (vector: Vector) => {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
};

enum EImage {
  Rocket,
  RocketStation,
  Earth,
  Moon,
  Sun,
  RocketPart,
  RocketPartInactive,
  RocketFire,
}

interface Vector {
  x: number;
  y: number;
}

interface Body {
  name: string;
  mass: number;
  radius: number;
  color: string;
  image?: EImage;
  position: Vector;
  velocity: Vector;
  rotation: number;
  rotationVelocity: number;
  border: number;
}

interface RocketExtraData {
  fuelLeft: number;
  thrustPower: number;
  mass: number;
  initialOffset: Vector;
  size: Vector;
  windApplies: boolean;
  speed: number;
  stages: number;
}

interface ThrusterData {
  timer1: number | undefined;
  timer2: number | undefined;
  audio1: HTMLAudioElement;
  audio2: HTMLAudioElement;
}

interface SystemState {
  paused: boolean;
  started: boolean;
  needsRefresh: boolean;
  starting: boolean;
  canRestart: boolean;
  gameClear: boolean;
  pressedPlay: boolean;
  bodiesAtStart: Body[];
  bodies: Body[];
  gameOver: boolean;
}

interface ScreenState {
  offset: Vector;
  actualOffset: Vector;
  shakeOffset: Vector;
  scale: number;
  scalePower: number;
  isDragging: boolean;
  mousePosition: Vector;
  lockedOn: string | null;
  backgroundRotation: number;
}

interface Preset {
  mass: number;
  thrustPower: number;
  fuelLeft: number;
  wind: number;
  stages: number;
}

const countdownTrack = new Audio();
countdownTrack.src = countdown;

const fadeOut = (audio: HTMLAudioElement) => {
  if (audio.volume !== 0) {
    audio.volume = clamp(audio.volume - 0.01, 0, 1);
    setTimeout(fadeOut, 5, audio);
  }
};

const SolarSystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dt = useRef(0.0166666667);
  const dtCoefficient = useRef(1);

  const [_, setFrame] = useState(0);

  const masterVolume = useRef(1);

  const rocketFrame = useRef(0);
  const rocketAnimTimer = useRef(0);
  const needToResetPreset = useRef(false);
  const launchPreset = useRef(0);

  const presets: Preset[] = [
    {
      mass: 2822,
      thrustPower: 34500,
      fuelLeft: 420,
      wind: -10,
      stages: 3,
    },

    {
      mass: 2822,
      thrustPower: 44000,
      fuelLeft: 600,
      wind: 1,
      stages: 3,
    },
    {
      mass: 2822,
      thrustPower: 54900,
      fuelLeft: 1380,
      wind: 20,
      stages: 3,
    },
    {
      mass: 2822,
      thrustPower: 40000,
      fuelLeft: 10,
      wind: 100,
      stages: 1,
    },
  ];

  const rocketThruster = useRef<ThrusterData>({
    timer1: undefined,
    timer2: undefined,
    audio1: new Audio(),
    audio2: new Audio(),
  });

  const thrusterCycle = () => {
    fadeOutAudio(rocketThruster.current.audio1);
    rocketThruster.current.audio2.volume = 0;
    rocketThruster.current.audio2.currentTime = 1;
    rocketThruster.current.audio2.play().then();
    fadeInAudio(rocketThruster.current.audio2);

    rocketThruster.current.timer1 = setTimeout(() => {
      fadeOutAudio(rocketThruster.current.audio2);
      rocketThruster.current.audio1.volume = 0;
      rocketThruster.current.audio1.currentTime = 1;
      rocketThruster.current.audio1.play().then();
      fadeInAudio(rocketThruster.current.audio1);
      rocketThruster.current.timer2 = setTimeout(thrusterCycle, 2500);
    }, 2500);
  };

  const rocketPartImages = [
    rocketPart1,
    rocketPart2,
    rocketPart3,
    rocketPart4,
    rocketPart5,
    rocketPart6,
  ];

  const skyImage = new Image();
  skyImage.src = sky;
  const cosmosImage = new Image();
  cosmosImage.src = cosmos;
  const earthImage = new Image();
  earthImage.src = earth;
  const rocketImage = new Image();
  rocketImage.src = rocket;
  const rocketPartImage = new Image();
  rocketPartImage.src = rocketPart;
  const rocketPartInactiveImage = new Image();
  rocketPartInactiveImage.src = rocketPart;
  const rocketFireImage = new Image();
  rocketFireImage.src = rocketPartImages[0];
  const rocketStationImage = new Image();
  rocketStationImage.src = rocketStation;
  const MoonImage = new Image();
  MoonImage.src = moon;
  const SunImage = new Image();
  SunImage.src = sun;

  function getImage(image: EImage): HTMLImageElement {
    switch (image) {
      default:
      case EImage.Rocket:
        return rocketImage;
      case EImage.RocketPart:
        return rocketPartImage;
      case EImage.RocketPartInactive:
        return rocketPartInactiveImage;
      case EImage.RocketStation:
        return rocketStationImage;
      case EImage.Earth:
        return earthImage;
      case EImage.Moon:
        return MoonImage;
      case EImage.Sun:
        return SunImage;
      case EImage.RocketFire:
        rocketFireImage.src = rocketPartImages[rocketFrame.current];
        return rocketFireImage;
    }
  }

  const rocketData = useRef<RocketExtraData>({
    fuelLeft: 0,
    thrustPower: 0,
    mass: 0,
    initialOffset: { x: 0, y: -120 },
    size: { x: 24 * 1.5, y: 39 * 1.5 },
    windApplies: true,
    speed: 0,
    stages: 3,
  });

  // INITIAL PARAMETERS REFS
  const mass = useRef(2822);
  const thrustPower = useRef(30000);
  const fuelLeft = useRef(800);
  const wind = useRef(0);
  const stages = useRef(3);

  const screenState = useRef<ScreenState>({
    offset: { x: 0, y: 0 },
    actualOffset: { x: 0, y: 0 },
    shakeOffset: { x: 0, y: 0 },
    scale: 467373274,
    scalePower: zoomMax,
    isDragging: false,
    mousePosition: { x: 0, y: 0 },
    lockedOn: "Rocket",
    backgroundRotation: 0,
  });

  const systemState = useRef<SystemState>({
    paused: false,
    started: false,
    gameOver: false,
    starting: false,
    needsRefresh: true,
    canRestart: false,
    gameClear: false,
    pressedPlay: false,
    bodiesAtStart: [
      {
        name: "Rocket",
        mass: 2822000,
        color: "white",
        radius: 10,
        position: {
          x: -AU + rocketData.current.initialOffset.x,
          y: -6371000 + rocketData.current.initialOffset.y,
        },
        velocity: { x: 0, y: 29780 },
        rotation: -90,
        rotationVelocity: 0,
        border: 5,
      },
      {
        name: "Earth",
        mass: 5.973e24,
        color: "#22222d",
        image: EImage.Earth,
        radius: 6371000,
        position: { x: -AU, y: 0 },
        velocity: { x: 0, y: 29780 },
        rotation: 0,
        rotationVelocity: -0.000001,
        border: 10,
      },
      {
        name: "RocketStation",
        mass: 1,
        color: "white",
        image: EImage.RocketStation,
        radius: 100,
        position: { x: -AU + 20, y: -6371080 },
        velocity: { x: 0, y: 29780 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
      {
        name: "Sun",
        mass: 1.989e30,
        color: "yellow",
        image: EImage.Sun,
        radius: 696000000,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        rotationVelocity: 0,
        border: 25,
      },
      {
        name: "Mercury",
        mass: 3.33e23,
        color: "brown",
        radius: 2,
        position: { x: 0.39 * AU, y: 0 },
        velocity: { x: 0, y: -40000 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
      {
        name: "Venus",
        mass: 4.868e24,
        color: "lightgrey",
        radius: 3,
        position: { x: 0, y: 0.72 * AU },
        velocity: { x: -30000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 10,
      },
      {
        name: "Moon",
        mass: 7.342e22,
        color: "gray",
        image: EImage.Moon,
        radius: 1737.5,
        position: { x: -AU, y: -0.00257 * AU },
        velocity: { x: 2583, y: 29780 },
        rotation: 0,
        rotationVelocity: 0.0001,
        border: 4,
      },
      {
        name: "Mars",
        mass: 6.417e23,
        color: "red",
        radius: 4,
        position: { x: 0, y: -1.52 * AU },
        velocity: { x: 24000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 10,
      },
      {
        name: "Jupiter",
        mass: 1.898e27,
        color: "orange",
        radius: 10,
        position: { x: 2 * AU, y: 0 },
        velocity: { x: 0, y: 24000 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 10,
      },
      {
        name: "Saturn",
        mass: 5.9726e24,
        color: "gold",
        radius: 8,
        position: { x: 0, y: 3.58 * AU },
        velocity: { x: 18000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 10,
      },
      {
        name: "Uranus",
        mass: 5.9726e24,
        color: "lightblue",
        radius: 6,
        position: { x: -4.22 * AU, y: 0 },
        velocity: { x: 0, y: 16000 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 10,
      },
      {
        name: "Neptune",
        mass: 5.9726e24,
        color: "blue",
        radius: 7,
        position: { x: 0, y: -4.65 * AU },
        velocity: { x: 15000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 10,
      },
    ],
    bodies: [],
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.load();
      video.oncanplaythrough = () => console.log("Video loaded!");
    }
  }, []);

  const setPreset = () => {
    mass.current = presets[launchPreset.current].mass;
    thrustPower.current = presets[launchPreset.current].thrustPower;
    fuelLeft.current = presets[launchPreset.current].fuelLeft;
    wind.current = presets[launchPreset.current].wind;
    stages.current = presets[launchPreset.current].stages;
  };

  const checkIfPresetIsApplicable = () => {
    for (let i = 0; i < 4; ++i) {
      if (
        mass.current === presets[i].mass &&
        thrustPower.current === presets[i].thrustPower &&
        fuelLeft.current === presets[i].fuelLeft &&
        wind.current === presets[i].wind &&
        stages.current === presets[i].stages
      ) {
        launchPreset.current = i;
        return;
      }
    }
    launchPreset.current = -1;
  };

  const startThrusters = () => {
    rocketThruster.current.audio1.src = thrusterSFX;
    rocketThruster.current.audio2.src = thrusterSFX;
    rocketThruster.current.audio1.volume =
      maxThrusterVolume * masterVolume.current;
    rocketThruster.current.audio1.play().then();
    clearTimeout(rocketThruster.current.timer1);
    clearTimeout(rocketThruster.current.timer2);
    rocketThruster.current.timer1 = setTimeout(thrusterCycle, 1500);
  };

  const stopThrusters = () => {
    rocketThruster.current.audio1.pause();
    rocketThruster.current.audio2.pause();
    clearTimeout(rocketThruster.current.timer1);
    clearTimeout(rocketThruster.current.timer2);
  };

  const gameEnd = (crash: boolean = true) => {
    systemState.current.paused = true;
    systemState.current.gameOver = true;

    if (!crash) {
      systemState.current.gameClear = true;
      if (videoRef.current !== null) {
        videoRef.current!.src = moonLanding;
        videoRef.current.currentTime = 85;
        videoRef.current.volume = 0.2;
      }
    } else {
      systemState.current.gameClear = false;
      if (videoRef.current !== null) {
        videoRef.current!.src = explosionMeme;
        videoRef.current.currentTime = 0.1;
        videoRef.current.volume = 1;
      }
    }

    stopThrusters();

    if (videoRef.current !== null) setFrame((frame) => frame + 1);

    videoRef.current?.play().then();
    setTimeout(() => {
      systemState.current.canRestart = true;

      if (systemState.current.gameClear) {
        gameOverTrack.src = victoryMusic;
      } else {
        gameOverTrack.src = gameOverMusic;
      }

      musicTrack.currentTime = 0;
      gameOverTrack.currentTime = 0;
      gameOverTrack.volume = 1;
      gameOverTrack.play().then();
    }, 1400);
  };

  const restart = () => {
    systemState.current.canRestart = false;
    systemState.current.gameOver = false;
    systemState.current.gameClear = false;
    systemState.current.paused = false;
    systemState.current.started = false;
    videoRef.current?.pause();
    fadeOutAudio(gameOverTrack);
    beforeStartTrack.play().then();
    playSound(pressStartSFX);
    systemState.current.bodies = structuredClone(
      systemState.current.bodiesAtStart,
    );
  };

  const getRocketDistanceCoefficient = (distance: number) => {
    return (
      (1 -
        (clamp(distance - 100, 8000, 20900) -
          8000 +
          Number(screenState.current.lockedOn === "Moon") * 20900) /
          12900) *
        2 -
      1
    );
  };

  const getScaleCoefficient = () => {
    return (
      clamp(
        (screenState.current.scalePower - 16000) / (zoomMax - 16000),
        0,
        1,
      ) *
        2 -
      1
    );
  };

  const shakeCamera = (coefficient: number) => {
    screenState.current.shakeOffset.x = (Math.random() * 8 - 4) * coefficient;
    screenState.current.shakeOffset.y = (Math.random() * 8 - 4) * coefficient;
  };

  const updateScale = () => {
    screenState.current.scale = Math.pow(
      2,
      screenState.current.scalePower / 1000 + 1,
    );
  };

  const computeGravityForce = (body1: Body, body2: Body): Vector => {
    const dx = body2.position.x - body1.position.x;
    const dy = body2.position.y - body1.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return { x: 0, y: 0 }; // Avoid division by zero

    const forceMagnitude =
      (G * body1.mass * body2.mass) / (distance * distance);
    return {
      x: (forceMagnitude * dx) / distance,
      y: (forceMagnitude * dy) / distance,
    };
  };

  const updateBodies = (bodies: Body[]) => {
    const forces: Vector[] = bodies.map(() => ({
      x: 0,
      y: 0,
    }));

    for (let i = 0; i < bodies.length; i++) {
      for (let j = 0; j < bodies.length; j++) {
        if (i !== j) {
          const force = computeGravityForce(bodies[i], bodies[j]);
          forces[i].x += force.x;
          forces[i].y += force.y;
        }
      }
    }

    if (rocketData.current.fuelLeft > 0) {
      forces[0].x +=
        Math.cos(toRadians(bodies[0].rotation)) *
        rocketData.current.thrustPower;
      forces[0].y +=
        Math.sin(toRadians(bodies[0].rotation)) *
        rocketData.current.thrustPower;
      rocketData.current.fuelLeft = Math.max(
        0,
        rocketData.current.fuelLeft - dt.current / 5,
      );
    } else {
      clearInterval(rocketAnimTimer.current);
      stopThrusters();
    }

    for (let i = 0; i < bodies.length; i++) {
      bodies[i].velocity.x += (forces[i].x / bodies[i].mass) * dt.current;
      bodies[i].velocity.y += (forces[i].y / bodies[i].mass) * dt.current;
      bodies[i].position.x += bodies[i].velocity.x * dt.current;
      bodies[i].position.y += bodies[i].velocity.y * dt.current;
      bodies[i].rotation += bodies[i].rotationVelocity * dt.current;
    }

    rocketData.current.speed = scalarFromVector({
      x: bodies[0].velocity.x - bodies[1].velocity.x,
      y: bodies[0].velocity.y - bodies[1].velocity.y,
    });

    if (!rocketData.current.windApplies) {
      bodies[0].rotation = toDegrees(
        Math.atan2(
          bodies[0].velocity.y - bodies[1].velocity.y,
          bodies[0].velocity.x - bodies[1].velocity.x,
        ),
      );
    }
  };

  const drawRotatedImage = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    angle: number,
    size: number,
  ) => {
    ctx.save(); // Save the current state

    ctx.translate(x, y); // Move to the image position
    ctx.rotate(angle); // Rotate by the given angle
    ctx.drawImage(image, -size / 2, -size / 2, size, size); // Draw centered
    ctx.restore(); // Restore the previous state
  };

  const drawRotatedBG = (ctx: CanvasRenderingContext2D, angle: number) => {
    ctx.save(); // Save the current state
    ctx.translate(cosmosImage.width / 4, cosmosImage.height / 4);
    ctx.rotate(toRadians(angle)); // Rotate by the given angle

    ctx.drawImage(
      cosmosImage,
      -cosmosImage.width / 2,
      -cosmosImage.height / 2,
      cosmosImage.width,
      cosmosImage.height,
    ); // Draw centered
    ctx.restore(); // Restore the previous state

    screenState.current.backgroundRotation += 0.01;
  };

  const drawRotatedRocket = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    scale: number,
  ) => {
    ctx.save(); // Save the current state
    ctx.translate(x, y); // Move to the image position
    ctx.rotate(angle); // Rotate by the given angle
    ctx.drawImage(
      getImage(EImage.Rocket),
      (-rocketData.current.size.x * scale) / 2,
      (-rocketData.current.size.y * scale) / 2,
      rocketData.current.size.x * scale,
      rocketData.current.size.y * scale,
    ); // Draw centered
    if (systemState.current.started && rocketData.current.fuelLeft > 0) {
      ctx.drawImage(
        getImage(EImage.RocketFire),
        (-rocketData.current.size.x * scale) / 2,
        (-rocketData.current.size.y * scale) / 2,
        rocketData.current.size.x * scale,
        rocketData.current.size.y * scale,
      );
    }
    ctx.restore(); // Restore the previous state
  };

  const drawRotatedRocketPart = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    scale: number,
    index: number,
  ) => {
    ctx.save(); // Save the current state
    ctx.translate(x, y); // Move to the image position
    ctx.rotate(angle); // Rotate by the given angle
    ctx.drawImage(
      getImage(EImage.RocketPart),
      (-rocketData.current.size.x * scale) / 2,
      (-rocketData.current.size.y * scale) / 2 + 24 * scale * index,
      rocketData.current.size.x * scale,
      rocketData.current.size.y * scale,
    ); // Draw centered
    if (systemState.current.started && rocketData.current.fuelLeft > 0) {
      ctx.drawImage(
        getImage(EImage.RocketFire),
        (-rocketData.current.size.x * scale) / 2,
        (-rocketData.current.size.y * scale) / 2 + 24 * scale * index,
        rocketData.current.size.x * scale,
        rocketData.current.size.y * scale,
      );
    }
    ctx.restore(); // Restore the previous state
  };

  const drawRocket = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    drawRotatedRocket(
      ctx,
      x,
      y,
      toRadians(systemState.current.bodies[0].rotation + 90),
      SCALE * screenState.current.scale * 2,
    );

    for (let i = 0; i < rocketData.current.stages - 1; ++i) {
      drawRotatedRocketPart(
        ctx,
        x,
        y,
        toRadians(systemState.current.bodies[0].rotation + 90),
        SCALE * screenState.current.scale * 2,
        i + 1,
      );
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawBodies = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      drawRotatedBG(ctx, screenState.current.backgroundRotation);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const distanceBetweenRocketAndEarth =
        distance(
          systemState.current.bodies[0].position.x,
          systemState.current.bodies[0].position.y,
          systemState.current.bodies[1].position.x,
          systemState.current.bodies[1].position.y,
        ) - systemState.current.bodies[1].radius;

      const distanceBetweenRocketAndMoon =
        distance(
          systemState.current.bodies[0].position.x,
          systemState.current.bodies[0].position.y,
          systemState.current.bodies[6].position.x,
          systemState.current.bodies[6].position.y,
        ) - systemState.current.bodies[6].radius;

      console.log(distanceBetweenRocketAndMoon);

      if (distanceBetweenRocketAndMoon < 1000) {
        gameEnd(false);
      }

      if (distanceBetweenRocketAndEarth < 0) {
        gameEnd();
      }

      if (rocketData.current.speed > 7800) {
        rocketData.current.windApplies = false;
      }

      if (!systemState.current.paused && systemState.current.started) {
        if (
          rocketData.current.stages === 3 &&
          rocketData.current.fuelLeft < fuelLeft.current * 0.5
        ) {
          rocketData.current.mass = (mass.current - mass.current * 0.8) * 1000;
          rocketData.current.thrustPower = (thrustPower.current * 1000) / 6;
          rocketData.current.stages = 2;

          systemState.current.bodies.push({
            name: "RocketPart2",
            mass: mass.current * 0.8,
            color: "white",
            image: EImage.RocketPartInactive,
            radius: 40,
            position: {
              x:
                systemState.current.bodies[0].position.x +
                100 *
                  Math.cos(
                    toRadians(systemState.current.bodies[0].rotation + 180),
                  ),
              y:
                systemState.current.bodies[0].position.y +
                100 *
                  Math.sin(
                    toRadians(systemState.current.bodies[0].rotation + 180),
                  ),
            },
            velocity: {
              x: systemState.current.bodies[0].velocity.x,
              y: systemState.current.bodies[0].velocity.y,
            },
            rotation: systemState.current.bodies[0].rotation + 90,
            rotationVelocity: 0,
            border: 0,
          });

          playSound(stageAwaySFX, 0.7);
        }

        if (
          rocketData.current.stages === 2 &&
          rocketData.current.fuelLeft < fuelLeft.current * 0.25
        ) {
          rocketData.current.thrustPower = thrustPower.current * 30;
          rocketData.current.mass = mass.current * 0.05;
          rocketData.current.stages = 1;

          systemState.current.bodies.push({
            name: "RocketPart1",
            mass: mass.current * 0.15,
            color: "white",
            image: EImage.RocketPartInactive,
            radius: 40,
            position: {
              x:
                systemState.current.bodies[0].position.x +
                50 *
                  Math.cos(
                    toRadians(systemState.current.bodies[0].rotation + 180),
                  ),
              y:
                systemState.current.bodies[0].position.y +
                50 *
                  Math.sin(
                    toRadians(systemState.current.bodies[0].rotation + 180),
                  ),
            },
            velocity: {
              x: systemState.current.bodies[0].velocity.x,
              y: systemState.current.bodies[0].velocity.y,
            },
            rotation: systemState.current.bodies[0].rotation + 90,
            rotationVelocity: 0,
            border: 0,
          });

          playSound(stageAwaySFX, 0.7);
        }

        if (
          rocketData.current.fuelLeft > 0 &&
          screenState.current.scalePower > 25000
        ) {
          shakeCamera(clamp(1 - distanceBetweenRocketAndEarth / 4000, 0, 1));
        }
      }

      ctx.globalAlpha = clamp(
        (getRocketDistanceCoefficient(distanceBetweenRocketAndEarth) +
          getScaleCoefficient()) /
          2,
        0,
        1,
      );
      ctx.drawImage(
        skyImage,
        (skyImage.width * 0.7) / -2,
        skyImage.height * -0.5 +
          (distanceBetweenRocketAndEarth + screenState.current.offset.y) / 10,
        skyImage.width * 0.7,
        skyImage.height * 0.7,
      );
      ctx.globalAlpha = 1;

      systemState.current.bodies.forEach((body) => {
        const x =
          canvas.width / 2 +
          body.position.x * SCALE * screenState.current.scale +
          screenState.current.actualOffset.x;
        const y =
          canvas.height / 2 +
          body.position.y * SCALE * screenState.current.scale +
          screenState.current.actualOffset.y;

        if (body.image === undefined) {
          ctx.beginPath();
          ctx.arc(
            x,
            y,
            body.radius * SCALE * screenState.current.scale + body.border,
            0,
            2 * Math.PI,
          );
          ctx.fillStyle = body.color;
          ctx.fill();
        } else {
          if (body.border !== 0) {
            ctx.beginPath();
            ctx.arc(
              x,
              y,
              body.radius * SCALE * screenState.current.scale + body.border,
              0,
              2 * Math.PI,
            );
            ctx.fillStyle = body.color;
            ctx.fill();
          }

          drawRotatedImage(
            ctx,
            getImage(body.image),
            x,
            y,
            toRadians(body.rotation),
            body.radius * SCALE * screenState.current.scale * 2,
          );
        }
      });

      const x =
        canvas.width / 2 +
        systemState.current.bodies[0].position.x *
          SCALE *
          screenState.current.scale +
        screenState.current.actualOffset.x;
      const y =
        canvas.height / 2 +
        systemState.current.bodies[0].position.y *
          SCALE *
          screenState.current.scale +
        screenState.current.actualOffset.y;

      ctx.beginPath();
      ctx.arc(
        x,
        y,
        systemState.current.bodies[0].radius *
          SCALE *
          screenState.current.scale +
          systemState.current.bodies[0].border,
        0,
        2 * Math.PI,
      );
      ctx.fillStyle = systemState.current.bodies[0].color;
      ctx.fill();

      drawRocket(ctx, x, y);
    };

    // const drawVectors = () => {
    //   systemState.current.bodies.forEach((body) => {
    //     const x1 =
    //       canvas.width / 2 +
    //       body.position.x * SCALE * screenState.current.scale +
    //       screenState.current.offset.x;
    //     const y1 =
    //       canvas.height / 2 +
    //       body.position.y * SCALE * screenState.current.scale +
    //       screenState.current.offset.y;
    //
    //     const x2 =
    //       canvas.width / 2 +
    //       (body.position.x * SCALE + body.velocity.x * vectorScale) *
    //         screenState.current.scale +
    //       screenState.current.offset.x;
    //     const y2 =
    //       canvas.height / 2 +
    //       (body.position.y * SCALE + body.velocity.y * vectorScale) *
    //         screenState.current.scale +
    //       screenState.current.offset.y;
    //     ctx.beginPath();
    //     ctx.moveTo(x1, y1);
    //     ctx.lineTo(x2, y2);
    //     ctx.strokeStyle = "white";
    //     ctx.stroke();
    //   });
    // };

    const lockOn = () => {
      let bodyToLockOn: Body | null = null;

      for (const body of systemState.current.bodies) {
        if (body.name === screenState.current.lockedOn) {
          bodyToLockOn = body;
        }
      }

      if (bodyToLockOn) {
        screenState.current.actualOffset.x =
          bodyToLockOn.position.x * -SCALE * screenState.current.scale +
          screenState.current.offset.x +
          screenState.current.shakeOffset.x;
        screenState.current.actualOffset.y =
          bodyToLockOn.position.y * -SCALE * screenState.current.scale +
          screenState.current.offset.y +
          screenState.current.shakeOffset.y;
      }
    };

    const animate = () => {
      if (systemState.current.gameOver) {
        musicTrack.pause();
      } else {
        if (screenState.current.lockedOn !== null) {
          lockOn();
        }

        drawBodies();
        if (systemState.current.started && !systemState.current.paused) {
          updateBodies(systemState.current.bodies);
        } else if (!systemState.current.started) {
          rocketData.current.stages = stages.current;

          if (needToResetPreset.current) {
            setPreset();
            needToResetPreset.current = false;
          }

          checkIfPresetIsApplicable();
        }
      }
      setFrame((frame) => frame + 1);

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  const handleContext = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    // let clickedBody: Body | null = null,
    //   minDistance = 99999;
    //
    // for (const body of systemState.current.bodiesAtStart) {
    //   const currentDistance = distance(
    //     body.position.x,
    //     body.position.y,
    //     event.clientX,
    //     event.clientY,
    //   );
    //
    //   body.border = 0;
    //
    //   if (clickedBody === null) {
    //     clickedBody = body;
    //     minDistance = currentDistance;
    //   }
    //
    //   if (minDistance > currentDistance) {
    //     clickedBody = body;
    //   }
    // }
    //
    // if (clickedBody !== null) {
    //   clickedBody.border = 5;
    // }
    //
    //
  };

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  };

  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    screenState.current.isDragging = true;
    screenState.current.mousePosition.x = event.clientX;
    screenState.current.mousePosition.y = event.clientY;
  };

  const handleMouseUp = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    screenState.current.isDragging = false;
  };

  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    if (screenState.current.isDragging) {
      screenState.current.offset.x -=
        screenState.current.mousePosition.x - event.clientX;
      screenState.current.offset.y -=
        screenState.current.mousePosition.y - event.clientY;
    }

    screenState.current.mousePosition.x = event.clientX;
    screenState.current.mousePosition.y = event.clientY;
  };

  const pressedPlay = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (systemState.current.started) {
      systemState.current.paused = !systemState.current.paused;
      clearInterval(rocketAnimTimer.current);
      stopThrusters();

      if (systemState.current.paused) {
        musicTrack.pause();

        playSound(simStopSFX);
      } else {
        musicTrack.play().then();
        startThrusters();
        rocketAnimTimer.current = setInterval(() => {
          rocketFrame.current = (rocketFrame.current + 1) % 6;
        }, 100);

        playSound(simPlaySFX);
      }
    } else {
      fadeOutAudio(beforeStartTrack);
      systemState.current.starting = true;

      rocketData.current.mass = mass.current * 1000;
      rocketData.current.fuelLeft = fuelLeft.current;
      rocketData.current.thrustPower = thrustPower.current * 1000;
      systemState.current.bodies[0].rotationVelocity = wind.current / 100;

      playSound(takeOffSFX, 0.6);

      document.body.classList.add(styles.go);

      countdownTrack.play().then(() =>
        setTimeout(() => {
          systemState.current.started = true;
          musicTrack.play().then();
          clearInterval(rocketAnimTimer.current);
          rocketAnimTimer.current = setInterval(() => {
            rocketFrame.current = (rocketFrame.current + 1) % 6;
          }, 100);

          setTimeout(startThrusters, 200);

          systemState.current.starting = false;

          setTimeout(() => document.body.classList.remove(styles.go), 2500);
        }, 5500),
      );
    }
  };

  const pressedStop = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (systemState.current.started) {
      systemState.current.paused =
        systemState.current.started =
        systemState.current.gameOver =
          false;
      musicTrack.load();
      stopThrusters();
    }

    beforeStartTrack.play().then();
    playSound(restartSimSFX);
    rocketData.current.windApplies = true;
  };

  const handleMouseWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    const lastScale = screenState.current.scale;
    screenState.current.scalePower -= event.deltaY;

    if (
      screenState.current.scalePower <= zoomMax &&
      screenState.current.scalePower >= zoomMin
    ) {
      screenState.current.actualOffset.x +=
        (screenState.current.actualOffset.x / screenState.current.scalePower) *
        (screenState.current.scalePower - lastScale);

      screenState.current.actualOffset.y +=
        (screenState.current.actualOffset.y / screenState.current.scalePower) *
        (screenState.current.scalePower - lastScale);
    }

    screenState.current.scalePower = clamp(
      screenState.current.scalePower,
      zoomMin,
      zoomMax,
    );

    updateScale();
  };

  if (!systemState.current.started && !systemState.current.starting) {
    systemState.current.bodies = structuredClone(
      systemState.current.bodiesAtStart,
    );

    // if (systemState.current.needsRefresh) {
    //   for (let i = 0; i < 100000 + Math.random() * 100000000; ++i) {
    //     updateBodies(systemState.current.bodiesAtStart);
    //   }
    //
    //   systemState.current.needsRefresh  = false;
    // }
    musicTrack.volume = masterVolume.current;
    beforeStartTrack.volume = masterVolume.current;
    countdownTrack.volume = masterVolume.current;

    titleTrack.play().then();
  }

  const pressedStart = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    fadeOutAudio(titleTrack);
    beforeStartTrack.play().then();
    playSound(pressStartSFX);

    setTimeout(() => {
      systemState.current.pressedPlay = true;
    }, 1000);
  };

  const scaleChange = (value: number) => {
    screenState.current.scalePower = value;

    updateScale();
  };

  const formatter: NonNullable<SliderSingleProps["tooltip"]>["formatter"] = (
    value,
  ) => `${value}x`;
  // ) => `${value}`;

  const resetCameraLock = (objectToLockOn: string, scale: number) => {
    screenState.current.lockedOn = objectToLockOn;
    screenState.current.offset.x = screenState.current.offset.y = 0;
    screenState.current.scalePower = scale;
    playSound(clickSFX);
    updateScale();
  };

  const changeDt = (value: number) => {
    dtCoefficient.current = value;
    dt.current = realTime * value;
  };

  const stylesheet = `.${styles.fuelmeter} { --arrow-angle: ${180 - (180 * rocketData.current.fuelLeft) / Math.max(fuelLeft.current, 0.001)}deg !important; } .${styles.speedometer} { --arrow-angle: ${180 - Math.min((180 * rocketData.current.speed) / 16650, 180)}deg  !important; }`;

  return (
    <>
      {systemState.current.pressedPlay ? null : (
        <TitleMenu handleStart={pressedStart} />
      )}
      <div className={`${styles.canvasWrapper}`}>
        <div
          className={`${styles.restartMenu} ${!systemState.current.canRestart ? styles.hidden : ""} ${systemState.current.gameClear ? styles.victory : ""}`}
        >
          <div className={styles.GameOver}>
            {systemState.current.gameClear ? "MISSION COMPLETE!" : "GAME OVER"}
          </div>
          <button
            onClick={restart}
            className={`${styles.restart} ${!systemState.current.canRestart ? styles.blinking : ""}`}
          >
            {"> Restart <"}
          </button>
        </div>
        <video
          ref={videoRef}
          className={`${styles.video} ${systemState.current.gameOver ? styles.videoOn : null}`}
          width="1920"
          height="1080"
        >
          <source src={explosionMeme} type="video/mp4" />
        </video>
        <div
          className={`${styles.presetsContainer} ${systemState.current.started || systemState.current.starting ? styles.hidden : ""}`}
        >
          <div className={styles.presetsHeader}>Пресеты</div>
          <div className={styles.presetsWrapper}>
            <div
              className={`${styles.preset} ${launchPreset.current === 0 ? styles.active : ""}`}
              onClick={() => {
                needToResetPreset.current = true;
                launchPreset.current = 0;
                playSound(setPresetSFX);
              }}
            >
              1
            </div>
            <div
              className={`${styles.preset} ${launchPreset.current === 1 ? styles.active : ""}`}
              onClick={() => {
                needToResetPreset.current = true;
                launchPreset.current = 1;
                playSound(setPresetSFX);
              }}
            >
              2
            </div>
            <div
              className={`${styles.preset} ${launchPreset.current === 2 ? styles.active : ""}`}
              onClick={() => {
                needToResetPreset.current = true;
                launchPreset.current = 2;
                playSound(setPresetSFX);
              }}
            >
              3
            </div>
            <div
              className={`${styles.preset} ${launchPreset.current === 3 ? styles.active : ""}`}
              onClick={() => {
                needToResetPreset.current = true;
                launchPreset.current = 3;
                playSound(setPresetSFX);
              }}
            >
              4
            </div>
          </div>
        </div>
        <div
          className={`${styles.metersPanel} ${!systemState.current.started ? styles.hidden : null}`}
        >
          <style>{stylesheet}</style>
          <div className={styles.fuelmeter}></div>
          <div className={styles.speedometer}></div>
        </div>
        <div
          className={`${styles.leftPanel} ${systemState.current.started || systemState.current.starting ? styles.hidden : null}`}
        >
          <div className={styles.panelHeader}>Начальные параметры</div>
          <InitialParameter
            name={"Масса"}
            units={"т"}
            valueRef={mass}
            min={1}
            max={5000}
          />
          <InitialParameter
            name={"Топливо"}
            units={"т"}
            valueRef={fuelLeft}
            min={0}
            max={5000}
          />
          <InitialParameter
            name={"Сила тяги"}
            units={"кН"}
            valueRef={thrustPower}
            min={0}
            max={100000}
          />
          <InitialParameter
            name={"Ветер"}
            units={"м/с"}
            valueRef={wind}
            min={-100}
            max={100}
          />
          <InitialParameter
            name={"Ступеней"}
            units={""}
            valueRef={stages}
            min={1}
            max={3}
          />
        </div>
        <div
          className={`${styles.bottomPanel} ${systemState.current.starting ? styles.inactive : null}`}
        >
          <div className={styles.timeSetterWrapper}>
            <button
              className={styles.timeSlowerButton}
              onClick={() => {
                dtCoefficient.current = Math.round(
                  clamp(dtCoefficient.current / 2, 1, 500),
                );
                changeDt(dtCoefficient.current);
              }}
            ></button>
            <div className={styles.timeSliderWrapper}>
              <Slider
                styles={{
                  track: {},
                  rail: { opacity: 1, background: "#fff" },
                  handle: {
                    scale: "1.1",
                  },
                }}
                min={1}
                max={500}
                defaultValue={1}
                value={dtCoefficient.current}
                tooltip={{ formatter }}
                onChange={changeDt}
              />
            </div>
            <button
              className={styles.timeFasterButton}
              onMouseDown={() => {
                dt.current = 3600;
              }}
              onMouseUp={() => {
                changeDt(dtCoefficient.current);
              }}
            ></button>
            <div className={styles.timeSetterIcon}></div>
          </div>
          <div className={styles.mainButtonsWrapper}>
            <button
              className={`${styles.button} ${styles.volumeButton} ${masterVolume.current === 0 ? styles.muted : null}`}
              onClick={() => {
                if (masterVolume.current === 1) {
                  masterVolume.current = 0;
                  musicTrack.volume = 0;
                  playSound(soundOffSFX);
                } else {
                  masterVolume.current = 1;
                  musicTrack.volume = 1;
                  playSound(soundOnSFX);
                }
              }}
            ></button>
            <button
              className={`${styles.button} ${styles.playButton} ${systemState.current.started && !systemState.current.paused ? styles.playButtonPaused : ""}`}
              onClick={pressedPlay}
            ></button>
            <button
              className={`${styles.button} ${styles.stopButton} ${!systemState.current.started ? styles.buttonInactive : ""}`}
              onClick={pressedStop}
            ></button>
          </div>
          <div className={styles.cameraLockerWrapper}>
            <div className={styles.cameraLockIcon}></div>
            <button
              className={`${styles.cameraLockButton} ${styles.rocketIcon} ${screenState.current.lockedOn === "Rocket" ? styles.lockSelected : null}`}
              onClick={() => {
                resetCameraLock("Rocket", 27800);
              }}
            ></button>
            <button
              className={`${styles.cameraLockButton} ${styles.earthIcon} ${screenState.current.lockedOn === "Earth" ? styles.lockSelected : null}`}
              onClick={() => {
                resetCameraLock("Earth", 13000);
              }}
            ></button>
            <button
              className={`${styles.cameraLockButton} ${styles.moonIcon} ${screenState.current.lockedOn === "Moon" ? styles.lockSelected : null}`}
              onClick={() => {
                resetCameraLock("Moon", 24200);
              }}
            ></button>
            <button
              className={`${styles.cameraLockButton} ${styles.sunIcon} ${screenState.current.lockedOn === "Sun" ? styles.lockSelected : null}`}
              onClick={() => {
                resetCameraLock("Sun", 1);
              }}
            ></button>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <Slider
            styles={{
              track: {},
              rail: { opacity: 1, background: "#fff" },
              handle: {
                scale: "1.1",
              },
            }}
            min={zoomMin}
            max={zoomMax}
            vertical={true}
            defaultValue={27800}
            value={screenState.current.scalePower}
            onChange={scaleChange}
            tooltip={{ formatter: null }}
          />
        </div>
        <canvas
          className={styles.canvas}
          onContextMenu={handleContext}
          onClick={handleClick}
          onWheel={handleMouseWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          ref={canvasRef}
          width={1920}
          height={942}
          style={{ background: "black", imageRendering: "pixelated" }}
        />
        <div style={{ transform: `scaleX(${Math.random()})` }}></div>
      </div>
    </>
  );
};

export default SolarSystem;
