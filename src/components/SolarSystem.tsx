import React, {
  useRef,
  useEffect,
  MouseEvent,
  WheelEvent,
  useState,
  FormEvent,
} from "react";
import styles from "../styles/SolarSystem.module.scss";
import cosmos from "../assets/images/cosmos.jpg";
import earth from "../assets/images/earth.png";
import startMusic from "../assets/audio/music/MetroidBrinstarOrchestral.opus";

const G = 6.674e-11; // Gravitational constant
const AU = 1.496e11; // 1 AU in meters
const SCALE = 200 / AU; // Scale for visualization
// let dt = 0.03; // 1 hour per tick
let dt = 0.0166666667;
// const vectorScale = 0.0001;
const zoomMin = -1000,
  zoomMax = 20800;

interface Vector {
  x: number;
  y: number;
}

interface Body {
  name: string;
  mass: number;
  radius: number;
  color: string;
  image: string | undefined;
  position: Vector;
  velocity: Vector;
  rotation: number;
  rotationVelocity: number;
  border: number;
}

interface SystemState {
  paused: boolean;
  started: boolean;
  needsRefresh: boolean;
  speed: number;
  rotation: number;
  bodiesAtStart: Body[];
  bodies: Body[];
}

interface ScreenState {
  offset: Vector;
  actualOffset: Vector;
  scale: number;
  scalePower: number;
  isDragging: boolean;
  mousePosition: Vector;
  lockedOn: string | null;
}

const SolarSystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [_, setFrame] = useState(0);

  function update() {
    setFrame((frame) => frame + 1);
  }

  const cosmosImage = new Image();
  cosmosImage.src = cosmos;
  const earthImage = new Image();
  earthImage.src = earth;

  const screenState = useRef<ScreenState>({
    offset: { x: 0, y: 30985 },
    actualOffset: { x: 13107201, y: 21792 },
    scale: 65536,
    scalePower: zoomMax,
    isDragging: false,
    mousePosition: { x: 0, y: 0 },
    lockedOn: "Earth",
  });

  // const screenState = useRef<ScreenState>({
  //   offset: { x: 0, y: 0 },
  //   actualOffset: { x: 0, y: 0 },
  //   scale: 1,
  //   scalePower: 1,
  //   isDragging: false,
  //   mousePosition: { x: 0, y: 0 },
  //   lockedOn: "Earth",
  // });

  const systemState = useRef<SystemState>({
    paused: false,
    started: false,
    needsRefresh: true,
    speed: 1,
    rotation: 0,
    bodiesAtStart: [
      {
        name: "Sun",
        mass: 1.989e30,
        color: "yellow",
        image: undefined,
        radius: 696000000,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 5,
      },
      {
        name: "Mercury",
        mass: 3.33e23,
        color: "brown",
        image: undefined,
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
        image: undefined,
        radius: 3,
        position: { x: 0, y: 0.72 * AU },
        velocity: { x: -30000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
      {
        name: "Earth",
        mass: 5.973e24,
        color: "blue",
        image: "../assets/images/earth.png",
        radius: 6371000,
        position: { x: -AU, y: 0 },
        velocity: { x: 0, y: 29780 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 10,
      },
      {
        name: "Moon",
        mass: 7.342e22,
        color: "gray",
        image: undefined,
        radius: 1737.5,
        position: { x: -AU, y: 0.00257 * AU },
        velocity: { x: 1022, y: 29780 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 5,
      },
      {
        name: "Mars",
        mass: 6.417e23,
        color: "red",
        image: undefined,
        radius: 4,
        position: { x: 0, y: -1.52 * AU },
        velocity: { x: 24000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
      {
        name: "Jupiter",
        mass: 1.898e27,
        color: "orange",
        image: undefined,
        radius: 10,
        position: { x: 2 * AU, y: 0 },
        velocity: { x: 0, y: 24000 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
      {
        name: "Saturn",
        mass: 5.9726e24,
        color: "gold",
        image: undefined,
        radius: 8,
        position: { x: 0, y: 3.58 * AU },
        velocity: { x: 18000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
      {
        name: "Uranus",
        mass: 5.9726e24,
        color: "lightblue",
        image: undefined,
        radius: 6,
        position: { x: -4.22 * AU, y: 0 },
        velocity: { x: 0, y: 16000 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
      {
        name: "Neptune",
        mass: 5.9726e24,
        color: "blue",
        image: undefined,
        radius: 7,
        position: { x: 0, y: -4.65 * AU },
        velocity: { x: 15000, y: 0 },
        rotation: 0,
        rotationVelocity: 0.001,
        border: 0,
      },
    ],
    bodies: [],
  });

  const updateScale = () => {
    const newScale = Math.pow(2, screenState.current.scalePower / 1000 + 1);

    // if (screenState.current.scale > newScale) {
    //   screenState.current.offset.x = screenState.current.offset.y = 0;
    // }

    screenState.current.scale = newScale;
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

    for (let i = 0; i < bodies.length; i++) {
      bodies[i].velocity.x += (forces[i].x / bodies[i].mass) * dt;
      bodies[i].velocity.y += (forces[i].y / bodies[i].mass) * dt;
      bodies[i].position.x += bodies[i].velocity.x * dt;
      bodies[i].position.y += bodies[i].velocity.y * dt;
      bodies[i].rotation += bodies[i].rotationVelocity * dt;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawBodies = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.drawImage(cosmosImage, 0, 0, canvas.width, canvas.height);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
          ctx.beginPath();
          ctx.arc(
            x,
            y,
            body.radius * SCALE * screenState.current.scale,
            0,
            2 * Math.PI,
          );
          ctx.fillStyle = "green";
          ctx.fill();
          drawRotatedImage(
            ctx,
            earthImage,
            x,
            y,
            body.rotation,
            body.radius * SCALE * screenState.current.scale * 2,
          );
        }
      });
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

      console.log("lockOn", bodyToLockOn);
      console.log(screenState.current.offset);

      if (bodyToLockOn) {
        screenState.current.actualOffset.x =
          bodyToLockOn.position.x * -SCALE * screenState.current.scale +
          screenState.current.offset.x;
        screenState.current.actualOffset.y =
          bodyToLockOn.position.y * -SCALE * screenState.current.scale +
          screenState.current.offset.y;
      }
    };

    const animate = () => {
      if (screenState.current.lockedOn !== null) {
        lockOn();
      }

      drawBodies();
      if (systemState.current.started && !systemState.current.paused) {
        updateBodies(systemState.current.bodies);
      } else if (!systemState.current.started) {
        // drawVectors();
      }

      console.log(JSON.stringify(screenState.current));

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  const handleContext = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    let clickedBody: Body | null = null,
      minDistance = 99999;

    for (const body of systemState.current.bodiesAtStart) {
      const currentDistance = distance(
        body.position.x,
        body.position.y,
        event.clientX,
        event.clientY,
      );

      body.border = 0;

      if (clickedBody === null) {
        clickedBody = body;
        minDistance = currentDistance;
      }

      if (minDistance > currentDistance) {
        clickedBody = body;
      }
    }

    if (clickedBody !== null) {
      clickedBody.border = 5;
    }

    update();
  };

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    update();
  };

  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    screenState.current.isDragging = true;
    screenState.current.mousePosition.x = event.clientX;
    screenState.current.mousePosition.y = event.clientY;

    update();
  };

  const handleMouseUp = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    screenState.current.isDragging = false;

    console.log(JSON.stringify(screenState.current));

    update();
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

    update();
  };

  const pressedPlay = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (systemState.current.started) {
      systemState.current.paused = !systemState.current.paused;
    } else {
      systemState.current.started = true;
      const audio = new Audio();
      audio.src = startMusic;
      audio.play().then();
    }

    update();
  };

  const pressedStop = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (systemState.current.started) {
      systemState.current.paused = false;
      systemState.current.started = false;
    }

    update();
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

    update();
  };

  const distance = (x1: number, y1: number, x2: number, y2: number): number =>
    Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  const clamp = (num: number, min: number, max: number): number =>
    Math.min(Math.max(num, min), max);

  if (!systemState.current.started) {
    systemState.current.bodies = structuredClone(
      systemState.current.bodiesAtStart,
    );

    // if (systemState.current.needsRefresh) {
    //   for (let i = 0; i < 100000 + Math.random() * 100000000; ++i) {
    //     updateBodies(systemState.current.bodiesAtStart);
    //   }
    //
    //   systemState.current.needsRefresh = false;
    // }
  }

  const scaleChange = (event: FormEvent<HTMLInputElement>) => {
    screenState.current.scalePower = Number(
      (event.target as HTMLInputElement).value,
    );

    updateScale();
    update();
  };

  return (
    <div className={styles.canvasWrapper}>
      <div className={styles.bottomPanel}>
        <div className={styles.mainButtonsWrapper}>
          <button
            className={`${styles.button} ${styles.playButton} ${systemState.current.started && !systemState.current.paused ? styles.playButtonPaused : ""}`}
            onClick={pressedPlay}
          ></button>
          <button
            className={`${styles.button} ${styles.stopButton} ${!systemState.current.started ? styles.buttonInactive : ""}`}
            onClick={pressedStop}
          ></button>
        </div>
      </div>
      <div className={styles.rightPanel}>
        <input
          type="range"
          min={zoomMin}
          max={zoomMax}
          value={screenState.current.scalePower}
          className={styles.slider}
          onInput={scaleChange}
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
        style={{ background: "black" }}
      />
    </div>
  );
};

export default SolarSystem;
