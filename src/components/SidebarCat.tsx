import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Car, AlertCircle, Rocket } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  vx: number;
  vy: number;
}

interface FlowerState {
  id: number;
  position: Position;
  petals: number;
  respawning: boolean;
}

interface MouseState {
  position: Position;
  visible: boolean;
  direction: 'left' | 'right' | 'up' | 'down';
  velocity: Velocity;
  lastTurnTime: number;
  appearedAt: number;
  isCaptured: boolean;
  captureTime: number;
  speedMode: 'normal' | 'rocket' | 'car';
}

export default function SidebarCat() {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ x: 50, y: 100 });
  const [velocity, setVelocity] = useState<Velocity>({ vx: 2, vy: 1 });
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState<Position | null>(null);
  const [action, setAction] = useState<'walk' | 'run' | 'jump' | 'sleep' | 'fall' | 'parachute' | 'rocket'>('walk');
  const [mouse, setMouse] = useState<MouseState>({
    position: { x: -50, y: 100 },
    visible: false,
    direction: 'right',
    velocity: { vx: 2, vy: 0 },
    lastTurnTime: 0,
    appearedAt: 0,
    isCaptured: false,
    captureTime: 0,
    speedMode: 'normal',
  });
  const lastMouseAppearTime = useRef<number>(Date.now());
  const mouseCooldown = useRef<number>(10000);
  const justCapturedMouse = useRef<boolean>(false);
  const catSpeedRef = useRef<number>(5);

  const [isPaused, setIsPaused] = useState(false);
  const [pauseButtonPetals, setPauseButtonPetals] = useState(0);

  const [flower, setFlower] = useState<FlowerState>({
    id: 0,
    position: { x: 100, y: 100 },
    petals: 5,
    respawning: false,
  });

  const positionRef = useRef(position);
  const velocityRef = useRef(velocity);
  const directionRef = useRef(direction);
  const isHoveredRef = useRef(isHovered);
  const mousePosRef = useRef(mousePos);
  const actionRef = useRef(action);
  const mouseRef = useRef(mouse);
  const flowerRef = useRef(flower);
  const isPausedRef = useRef(isPaused);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { velocityRef.current = velocity; }, [velocity]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { isHoveredRef.current = isHovered; }, [isHovered]);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
  useEffect(() => { actionRef.current = action; }, [action]);
  useEffect(() => { mouseRef.current = mouse; }, [mouse]);
  useEffect(() => { flowerRef.current = flower; }, [flower]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const isDark = !theme || theme === 'dark' || theme === 'cyberpunk' || theme === 'linear';
  const isCyberpunk = theme === 'cyberpunk';
  const isAnime = theme === 'anime';

  const getCatColor = () => {
    if (isCyberpunk) return '#06b6d4';
    if (isAnime) return '#fb923c';
    if (isDark) return '#9ca3af';
    return '#f97316';
  };

  const catColor = getCatColor();

  const getRandomFlowerPosition = (containerWidth: number, containerHeight: number) => {
    return {
      x: 30 + Math.random() * (containerWidth - 60),
      y: 30 + Math.random() * (containerHeight - 60),
    };
  };

  const checkCollision = (pos1: Position, pos2: Position, radius: number) => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy) < radius;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;

    const animate = () => {
      if (isHoveredRef.current || isPausedRef.current) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const containerHeight = container.clientHeight - 60;
      const containerWidth = container.clientWidth;

      const now = Date.now();

      if (!mouseRef.current.visible && now - lastMouseAppearTime.current > mouseCooldown.current) {
        const isInAir = Math.random() < 0.7;

        let startX = -50, startY = 100, vx = 2, vy = 0, dir: 'left' | 'right' | 'up' | 'down' = 'right';

        if (isInAir) {
          const fromTop = Math.random() > 0.5;
          if (fromTop) {
            startX = Math.random() * containerWidth;
            startY = -50;
            vx = 0;
            vy = 2;
            dir = 'down';
          } else {
            startX = Math.random() * containerWidth;
            startY = Math.random() * (containerHeight * 0.4);
            const airDirections = [
              { vx: 2, vy: 0, dir: 'right' as const },
              { vx: -2, vy: 0, dir: 'left' as const },
              { vx: 0, vy: 2, dir: 'down' as const },
              { vx: 0, vy: -2, dir: 'up' as const },
            ];
            const randomDir = airDirections[Math.floor(Math.random() * airDirections.length)];
            vx = randomDir.vx;
            vy = randomDir.vy;
            dir = randomDir.dir;
          }
        } else {
          const side = Math.random() > 0.5 ? 'left' : 'right';
          if (side === 'left') {
            startX = -50;
            startY = containerHeight - 30 - Math.random() * 50;
            vx = 2;
            vy = (Math.random() - 0.5) * 2;
            dir = 'right';
          } else {
            startX = containerWidth + 50;
            startY = containerHeight - 30 - Math.random() * 50;
            vx = -2;
            vy = (Math.random() - 0.5) * 2;
            dir = 'left';
          }
        }

        setMouse({
          position: { x: startX, y: startY },
          visible: true,
          direction: dir,
          velocity: { vx, vy },
          lastTurnTime: now,
          appearedAt: now,
          isCaptured: false,
          captureTime: 0,
          speedMode: 'normal',
        });
        lastMouseAppearTime.current = now;
      }

      if (mouseRef.current.visible) {
        setMouse((prev) => {
          const now = Date.now();

          const catDx = positionRef.current.x + 30 - (prev.position.x + 15);
          const catDy = positionRef.current.y + 30 - (prev.position.y + 15);
          const distToCat = Math.sqrt(catDx * catDx + catDy * catDy);
          const catIsChasing = actionRef.current === 'run' || actionRef.current === 'rocket';

          if (distToCat < 15 && catIsChasing && !prev.isCaptured) {
            justCapturedMouse.current = true;
            return {
              ...prev,
              isCaptured: true,
              captureTime: now,
              velocity: { vx: 0, vy: 0 },
            };
          }

          if (prev.isCaptured && now - prev.captureTime > 3000) {
            return {
              ...prev,
              visible: false,
              position: { x: -50, y: 100 },
              isCaptured: false,
              captureTime: 0,
            };
          }

          if (prev.isCaptured) {
            const struggleX = Math.sin(now * 0.05) * 3;
            const struggleY = Math.cos(now * 0.07) * 3;
            return {
              ...prev,
              position: {
                x: prev.position.x + struggleX * 0.1,
                y: prev.position.y + struggleY * 0.1,
              },
            };
          }

          const flowerDx = flowerRef.current.position.x + 10 - (prev.position.x + 15);
          const flowerDy = flowerRef.current.position.y + 10 - (prev.position.y + 15);
          const distToFlower = Math.sqrt(flowerDx * flowerDx + flowerDy * flowerDy);

          if (distToCat < 50 && catIsChasing) {
            const escapeVx = (-catDx / distToCat) * 4;
            const escapeVy = (-catDy / distToCat) * 4;

            let newDir: 'left' | 'right' | 'up' | 'down' = prev.direction;
            if (Math.abs(escapeVx) > Math.abs(escapeVy)) {
              newDir = escapeVx > 0 ? 'left' : 'right';
            } else {
              newDir = escapeVy > 0 ? 'up' : 'down';
            }

            return {
              ...prev,
              position: {
                x: prev.position.x + escapeVx,
                y: prev.position.y + escapeVy,
              },
              velocity: { vx: escapeVx, vy: escapeVy },
              direction: newDir,
              speedMode: 'normal',
            };
          }

          const catFlowerDx = flowerRef.current.position.x + 10 - (positionRef.current.x + 30);
          const catFlowerDy = flowerRef.current.position.y + 10 - (positionRef.current.y + 30);
          const catDistToFlower = Math.sqrt(catFlowerDx * catFlowerDx + catFlowerDy * catFlowerDy);
          const isFarFromFlower = distToFlower > catDistToFlower;
          const speed = catSpeedRef.current * 0.5;
          const targetVx = (flowerDx / distToFlower) * speed;
          const targetVy = (flowerDy / distToFlower) * speed;

          let newDir: 'left' | 'right' | 'up' | 'down' = prev.direction;
          if (Math.abs(targetVx) > Math.abs(targetVy)) {
            newDir = targetVx > 0 ? 'right' : 'left';
          } else {
            newDir = targetVy > 0 ? 'down' : 'up';
          }

          return {
            ...prev,
            position: {
              x: prev.position.x + targetVx,
              y: prev.position.y + targetVy,
            },
            velocity: { vx: targetVx, vy: targetVy },
            direction: newDir,
            speedMode: isFarFromFlower ? 'car' : 'normal',
          };
        });
      }

      setPosition((prev) => {
        let newX = prev.x + velocityRef.current.vx;
        let newY = prev.y + velocityRef.current.vy;
        let newVx = velocityRef.current.vx;
        let newVy = velocityRef.current.vy;

        const containerWidth = container.clientWidth - 60;

        if (mouseRef.current.visible && !isHoveredRef.current) {
          const dx = mouseRef.current.position.x - 15 - prev.x;
          const dy = mouseRef.current.position.y - 15 - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 15) {
            const mouseIsInAir = mouseRef.current.position.y < containerHeight - 100;

            if (mouseIsInAir && actionRef.current !== 'rocket') {
              setAction('rocket');
              const speed = 8;
              catSpeedRef.current = speed;
              newVx = (dx / distance) * speed;
              newVy = (dy / distance) * speed;
              setVelocity({ vx: newVx, vy: newVy });
              setDirection(newVx > 0 ? 'right' : 'left');
            } else {
              const speed = 5;
              catSpeedRef.current = speed;
              newVx = (dx / distance) * speed;
              newVy = (dy / distance) * speed;
              setVelocity({ vx: newVx, vy: newVy });
              setAction('run');
              setDirection(newVx > 0 ? 'right' : 'left');
            }
          }
        } else if (mousePosRef.current && !isHoveredRef.current) {
          const dx = mousePosRef.current.x - 30 - prev.x;
          const dy = mousePosRef.current.y - 30 - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 10) {
            const speed = distance > 100 ? 4 : 2;
            catSpeedRef.current = speed;
            newVx = (dx / distance) * speed;
            newVy = (dy / distance) * speed;
            setVelocity({ vx: newVx, vy: newVy });
            setAction(distance > 100 ? 'run' : 'walk');
          } else {
            setAction('sleep');
            newVx = 0;
            newVy = 0;
            setVelocity({ vx: 0, vy: 0 });
          }
        }

        if (newX <= 0) {
          newX = 0;
          newVx = Math.abs(newVx);
        } else if (newX >= containerWidth) {
          newX = containerWidth;
          newVx = -Math.abs(newVx);
        }

        const isFalling = newY < containerHeight - 100 && newVy > 0;

        if (isFalling && actionRef.current !== 'parachute') {
          setAction('fall');
        }

        if (isFalling && actionRef.current === 'fall' && newVy > 2) {
          setAction('parachute');
          newVy = 1;
        }

        if (newVy < 0 || (newY < containerHeight - 10 && newVy > 0 && actionRef.current !== 'parachute')) {
          newVy += actionRef.current === 'parachute' ? 0.02 : 0.15;
        }

        if (newY >= containerHeight) {
          newY = containerHeight;
          newVy = 0;
          if (actionRef.current === 'parachute') {
            setAction('walk');
          }
        }

        if (newVx !== 0) {
          setDirection(newVx > 0 ? 'right' : 'left');
        }
        if (!mousePosRef.current || isHoveredRef.current) {
          setVelocity({ vx: newVx, vy: newVy });
        }

        return { x: newX, y: newY };
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    const mouseMoveHandler = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setMousePos({ x, y });
      }
    };

    const mouseLeaveHandler = () => {
      setMousePos(null);
    };

    document.addEventListener('mousemove', mouseMoveHandler, true);
    container.addEventListener('mouseleave', mouseLeaveHandler);

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('mousemove', mouseMoveHandler, true);
      container.removeEventListener('mouseleave', mouseLeaveHandler);
    };
  }, []);

  useEffect(() => {
    if (isPaused || isHovered) return;

    const checkFlowerCollision = () => {
      const catCenter = {
        x: position.x + 30,
        y: position.y + 30,
      };

      const mouseCenter = {
        x: mouse.position.x + 15,
        y: mouse.position.y + 15,
      };

      const catReachesFlower = checkCollision(catCenter, flower.position, 20);
      const mouseReachesFlower = checkCollision(mouseCenter, flower.position, 20);

      if (mouse.visible && mouseReachesFlower && !flower.respawning && flower.petals > 0) {
        setFlower(prev => ({ ...prev, petals: prev.petals - 1 }));
        mouseCooldown.current = Math.max(1000, mouseCooldown.current - 2000);
        setMouse(prev => ({
          ...prev,
          visible: false,
          position: { x: -50, y: 100 },
        }));
        setPauseButtonPetals(prev => Math.max(0, prev - 1));
      }

      if (catReachesFlower && !flower.respawning && flower.petals > 0) {
        setFlower(prev => ({ ...prev, petals: prev.petals - 1 }));
        setPauseButtonPetals(prev => Math.min(5, prev + 1));
      }
    };

    checkFlowerCollision();
  }, [position, mouse.position, flower, isPaused, isHovered, mouse.visible]);

  useEffect(() => {
    if (flower.petals === 0 && !flower.respawning) {
      setFlower(prev => ({ ...prev, respawning: true }));

      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const newPos = getRandomFlowerPosition(container.clientWidth, container.clientHeight);
          setFlower(prev => ({
            id: prev.id + 1,
            position: newPos,
            petals: 5,
            respawning: false,
          }));
        }
      }, 1000);
    }
  }, [flower.petals, flower.respawning]);

  useEffect(() => {
    if (justCapturedMouse.current) {
      justCapturedMouse.current = false;
      setPauseButtonPetals(prev => Math.min(5, prev + 1));
    }
  }, [mouse.visible]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setVelocity({ vx: 0, vy: 0 });
    setAction('sleep');
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setVelocity({ vx: direction === 'right' ? 2 : -2, vy: 0 });
  };

  const renderFlower = (flowerState: FlowerState, isButton: boolean = false) => {
    const petalElements = [];
    const petalCount = flowerState.petals;

    for (let i = 0; i < petalCount; i++) {
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const cx = 10 + 5 * Math.cos(angle);
      const cy = 10 + 5 * Math.sin(angle);
      petalElements.push(
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx="3"
          ry="5"
          stroke={catColor}
          strokeWidth="1.5"
          fill="none"
          transform={`rotate(${i * 72} 10 10)`}
        />
      );
    }

    return (
      <svg
        width={isButton ? 20 : 24}
        height={isButton ? 20 : 24}
        viewBox="0 0 20 20"
        className={isButton ? (isPaused ? '' : 'animate-spin') : ''}
        style={isButton ? { animationDuration: isPaused ? '0s' : '2s' } : {}}
      >
        {petalElements}
        <circle cx="10" cy="10" r="2.5" stroke={catColor} strokeWidth="1.5" fill="none" />
        <circle cx="10" cy="10" r="1" fill={catColor} />
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 10 }}
    >
      {/* 花朵 - 随机位置 */}
      {!isPaused && flower.petals > 0 && (
        <div
          className="absolute transition-all duration-300"
          style={{
            left: flower.position.x,
            top: flower.position.y,
          }}
        >
          {renderFlower(flower)}
        </div>
      )}

      {/* 旋转小花暂停按钮 - 侧边栏右下角 */}
      <button
        onClick={() => setIsPaused(!isPaused)}
        className="absolute bottom-2 right-2 z-50 p-2 transition-all duration-200"
        title={isPaused ? '继续游戏' : '暂停游戏'}
      >
        <svg
          width="20"
          height="26"
          viewBox="0 0 20 26"
          className="absolute bottom-0"
        >
          <path
            d="M10 18 L10 26"
            stroke={catColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="pt-0">
          {renderFlower({ id: 0, position: { x: 0, y: 0 }, petals: Math.min(5, 5 + pauseButtonPetals), respawning: false }, true)}
        </div>
      </button>

      {/* 小老鼠 */}
      {mouse.visible && (
        <div
          className="absolute transition-transform duration-200"
          style={{
            left: mouse.position.x,
            top: mouse.position.y,
            transform: mouse.direction === 'left' ? 'scaleX(-1)' :
                      mouse.direction === 'right' ? 'scaleX(1)' :
                      mouse.direction === 'up' ? 'rotate(-90deg) scaleX(-1)' :
                      'rotate(90deg)',
            animation: mouse.isCaptured ? 'shake 0.1s linear infinite' : undefined,
          }}
        >
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className={mouse.isCaptured ? 'animate-pulse' : ''}>
            <ellipse cx="15" cy="18" rx="10" ry="7" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
            <circle cx="22" cy="14" r="5" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
            <circle cx="20" cy="10" r="2.5" stroke="#9ca3af" strokeWidth="1.5" fill="#fca5a5" />
            <circle cx="24" cy="10" r="2.5" stroke="#9ca3af" strokeWidth="1.5" fill="#fca5a5" />
            {mouse.isCaptured ? (
              <>
                <circle cx="23" cy="13" r="1.5" fill="#1f2937" />
                <circle cx="23.5" cy="12.5" r="0.5" fill="white" />
                <path d="M22 16 L24 16" stroke="#1f2937" strokeWidth="0.8" />
              </>
            ) : (
              <circle cx="23" cy="13" r="1" fill="#1f2937" />
            )}
            <circle cx="25" cy="15" r="1" fill="#fca5a5" />
            <path d="M24 15 L28 14" stroke="#9ca3af" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M24 16 L28 17" stroke="#9ca3af" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M5 18 Q0 15, -3 18" stroke="#fca5a5" strokeWidth="1" fill="none" className={mouse.isCaptured ? 'animate-[wiggle_0.2s_ease-in-out_infinite]' : 'animate-[wiggle_0.5s_ease-in-out_infinite]'} />
            <path d="M10 23 L8 27" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 24 L14 28" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M18 23 L20 27" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {mouse.speedMode === 'car' && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <Car size={14} className="animate-bounce" />
            </div>
          )}
          {mouse.isCaptured && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs animate-bounce">
              <AlertCircle size={12} />
              <span>挣扎中... {Math.max(0, 3 - Math.floor((Date.now() - mouse.captureTime) / 1000))}s</span>
            </div>
          )}
        </div>
      )}

      {/* 小猫 */}
      <div
        className="absolute transition-transform duration-100 pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          transform: `scaleX(${direction === 'left' ? -1 : 1})`,
          cursor: isHovered ? 'pointer' : 'default',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {action === 'parachute' && (
          <g className="absolute -top-8 left-1/2 -translate-x-1/2 animate-fade-in">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <path d="M10 30 Q40 0, 70 30" stroke={catColor} strokeWidth="2" fill="none" />
              <path d="M10 30 Q40 50, 70 30" stroke={catColor} strokeWidth="2" fill="none" opacity="0.5" />
              <path d="M15 32 L35 55" stroke={catColor} strokeWidth="1" opacity="0.6" />
              <path d="M40 30 L40 55" stroke={catColor} strokeWidth="1" opacity="0.6" />
              <path d="M65 32 L45 55" stroke={catColor} strokeWidth="1" opacity="0.6" />
              <path d="M35 55 L40 65 L45 55" stroke={catColor} strokeWidth="1.5" fill="none" />
            </svg>
          </g>
        )}

        {action === 'rocket' && (
          <g className="absolute -bottom-4 left-1/2 -translate-x-1/2 animate-fade-in">
            <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
              <path d="M30 80 L30 40 Q30 20, 40 10 Q50 20, 50 40 L50 80 Z" stroke={catColor} strokeWidth="2" fill="none" />
              <path d="M40 10 L40 0" stroke={catColor} strokeWidth="2" strokeLinecap="round" />
              <path d="M30 60 L20 75 L30 70" stroke={catColor} strokeWidth="2" fill="none" strokeLinejoin="round" />
              <path d="M50 60 L60 75 L50 70" stroke={catColor} strokeWidth="2" fill="none" strokeLinejoin="round" />
              <circle cx="40" cy="35" r="5" stroke={catColor} strokeWidth="2" fill="#fbbf24" opacity="0.6" />
              <g className="animate-[rocket-flame_0.1s_ease-in-out_infinite]">
                <path d="M32 80 L35 95 L40 85 L45 95 L48 80" stroke="#f97316" strokeWidth="2" fill="#fbbf24" opacity="0.8" />
                <path d="M35 80 L37 90 L40 82 L43 90 L45 80" stroke="#ef4444" strokeWidth="2" fill="#fca5a5" opacity="0.6" />
              </g>
              <circle cx="35" cy="95" r="3" fill="#9ca3af" opacity="0.4" className="animate-ping" />
              <circle cx="45" cy="95" r="3" fill="#9ca3af" opacity="0.4" className="animate-ping" style={{ animationDelay: '0.05s' }} />
            </svg>
          </g>
        )}

        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`drop-shadow-lg ${isHovered ? 'animate-pulse' : ''}`}
        >
          <path
            d={`M45 35 Q55 30, ${isHovered ? '50 25' : '55 20'}`}
            stroke={catColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className={`transition-all duration-300 ${isHovered ? '' : 'animate-[wiggle_1s_ease-in-out_infinite]'}`}
          />

          <ellipse cx="30" cy="35" rx="18" ry="12" stroke={catColor} strokeWidth="2" fill="none" />

          <path
            d={`M20 42 Q15 50, ${action === 'walk' || action === 'run' ? '12 48' : '15 50'}`}
            stroke={catColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className={action === 'walk' || action === 'run' ? 'animate-[walk_0.5s_ease-in-out_infinite]' : ''}
          />
          <path
            d={`M40 42 Q45 50, ${action === 'walk' || action === 'run' ? '48 48' : '45 50'}`}
            stroke={catColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className={action === 'walk' || action === 'run' ? 'animate-[walk_0.5s_ease-in-out_infinite_reverse]' : ''}
          />

          <path d="M24 44 L24 52" stroke={catColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M36 44 L36 52" stroke={catColor} strokeWidth="2" strokeLinecap="round" />

          <circle cx="30" cy="22" r="12" stroke={catColor} strokeWidth="2" fill="none" />

          <path d="M22 14 L18 5 L26 10 Z" stroke={catColor} strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M38 14 L42 5 L34 10 Z" stroke={catColor} strokeWidth="2" fill="none" strokeLinejoin="round" />

          {isHovered ? (
            <>
              <path d="M25 20 Q27 22, 29 20" stroke={catColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M31 20 Q33 22, 35 20" stroke={catColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="27" cy="21" r="2" fill={catColor} />
              <circle cx="33" cy="21" r="2" fill={catColor} />
            </>
          )}

          <path d="M29 25 L31 25 L30 27 Z" fill={catColor} />

          <path d="M20 24 L12 23" stroke={catColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M20 26 L12 26" stroke={catColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M20 28 L12 29" stroke={catColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M40 24 L48 23" stroke={catColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M40 26 L48 26" stroke={catColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M40 28 L48 29" stroke={catColor} strokeWidth="1" strokeLinecap="round" />

          {isHovered && (
            <g className="animate-fade-in">
              <path d="M5 5 Q10 0, 15 5 L15 15 Q15 20, 10 20 Q5 20, 5 15 Z" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.8" />
              <path d="M7 8 L7 12" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 6 L10 11" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M13 8 L13 12" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}
        </svg>

        {!isHovered && action === 'sleep' && (
          <div className="absolute -top-2 -right-2 text-xs animate-pulse">💤</div>
        )}
        {action === 'parachute' && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <span className="text-xs">☂️</span>
          </div>
        )}
        {action === 'rocket' && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Rocket size={14} className="animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
}
