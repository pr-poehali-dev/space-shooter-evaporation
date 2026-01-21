import { useState, useEffect, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface GameObject {
  id: number;
  x: number;
  y: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SHIP_SIZE = 40;
const MISSILE_WIDTH = 4;
const MISSILE_HEIGHT = 20;
const ASTEROID_SIZE = 30;
const SHIP_SPEED = 8;
const MISSILE_SPEED = 10;
const ASTEROID_SPEED = 3;

export default function Index() {
  const [shipPos, setShipPos] = useState<Position>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 60 });
  const [missiles, setMissiles] = useState<GameObject[]>([]);
  const [asteroids, setAsteroids] = useState<GameObject[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [score, setScore] = useState(0);
  const [destroyed, setDestroyed] = useState(0);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [gameStarted, setGameStarted] = useState(false);
  const [missileIdCounter, setMissileIdCounter] = useState(0);
  const [asteroidIdCounter, setAsteroidIdCounter] = useState(0);
  const [particleIdCounter, setParticleIdCounter] = useState(0);

  const createExplosion = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        id: particleIdCounter + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
    setParticleIdCounter(prev => prev + 15);
    setParticles(prev => [...prev, ...newParticles]);
  }, [particleIdCounter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D', ' '].includes(e.key)) {
        e.preventDefault();
        setKeys(prev => new Set(prev).add(e.key.toLowerCase()));
        
        if (e.key === ' ' && gameStarted) {
          setMissiles(prev => [...prev, {
            id: missileIdCounter,
            x: shipPos.x,
            y: shipPos.y - 20
          }]);
          setMissileIdCounter(prev => prev + 1);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(e.key.toLowerCase());
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [shipPos, gameStarted, missileIdCounter]);

  useEffect(() => {
    if (!gameStarted) return;

    const gameLoop = setInterval(() => {
      setShipPos(prev => {
        let newX = prev.x;
        if (keys.has('arrowleft') || keys.has('a')) {
          newX = Math.max(SHIP_SIZE / 2, prev.x - SHIP_SPEED);
        }
        if (keys.has('arrowright') || keys.has('d')) {
          newX = Math.min(GAME_WIDTH - SHIP_SIZE / 2, prev.x + SHIP_SPEED);
        }
        return { ...prev, x: newX };
      });

      setMissiles(prev => prev
        .map(m => ({ ...m, y: m.y - MISSILE_SPEED }))
        .filter(m => m.y > -MISSILE_HEIGHT)
      );

      setAsteroids(prev => {
        const updated = prev
          .map(a => ({ ...a, y: a.y + ASTEROID_SPEED }))
          .filter(a => a.y < GAME_HEIGHT + ASTEROID_SIZE);

        if (Math.random() < 0.02) {
          return [...updated, {
            id: asteroidIdCounter,
            x: Math.random() * (GAME_WIDTH - ASTEROID_SIZE) + ASTEROID_SIZE / 2,
            y: -ASTEROID_SIZE
          }];
        }
        return updated;
      });

      setAsteroids(prevAsteroids => {
        const remaining = [...prevAsteroids];
        const newMissiles = [...missiles];
        
        prevAsteroids.forEach(asteroid => {
          missiles.forEach(missile => {
            const dx = asteroid.x - missile.x;
            const dy = asteroid.y - missile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ASTEROID_SIZE / 2 + MISSILE_WIDTH) {
              const asteroidIdx = remaining.findIndex(a => a.id === asteroid.id);
              const missileIdx = newMissiles.findIndex(m => m.id === missile.id);
              
              if (asteroidIdx !== -1 && missileIdx !== -1) {
                remaining.splice(asteroidIdx, 1);
                newMissiles.splice(missileIdx, 1);
                createExplosion(asteroid.x, asteroid.y);
                setScore(prev => prev + 10);
                setDestroyed(prev => prev + 1);
              }
            }
          });
        });

        setMissiles(newMissiles);
        return remaining;
      });

      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0)
      );

      if (Math.random() < 0.01) {
        setAsteroidIdCounter(prev => prev + 1);
      }
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, keys, missiles, asteroidIdCounter, createExplosion]);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setDestroyed(0);
    setMissiles([]);
    setAsteroids([]);
    setParticles([]);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="relative">
        <div 
          className="relative bg-gradient-to-b from-[#0a0a1a] via-[#1a0a2e] to-[#0a0a1a] rounded-lg overflow-hidden shadow-2xl"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        >
          <div className="absolute inset-0 opacity-30">
            {[...Array(100)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: Math.random() * 2 + 1,
                  height: Math.random() * 2 + 1,
                  left: Math.random() * GAME_WIDTH,
                  top: Math.random() * GAME_HEIGHT,
                  opacity: Math.random() * 0.7 + 0.3,
                }}
              />
            ))}
          </div>

          {!gameStarted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold mb-4 text-primary" style={{ textShadow: '0 0 20px #00ffff' }}>
                  SPACE DEFENDER
                </h1>
                <p className="text-xl text-foreground mb-6">Управление: ← → или A D</p>
                <p className="text-xl text-foreground mb-8">Стрельба: ПРОБЕЛ</p>
                <button
                  onClick={startGame}
                  className="px-12 py-4 text-2xl font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-all"
                  style={{ boxShadow: '0 0 30px #00ffff' }}
                >
                  НАЧАТЬ ИГРУ
                </button>
              </div>
            </div>
          )}

          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-40">
            <div className="bg-black/50 px-6 py-3 rounded-lg backdrop-blur-sm border-2 border-primary/50">
              <div className="text-sm text-muted-foreground">ОЧКИ</div>
              <div className="text-3xl font-bold text-primary" style={{ textShadow: '0 0 10px #00ffff' }}>
                {score}
              </div>
            </div>
            <div className="bg-black/50 px-6 py-3 rounded-lg backdrop-blur-sm border-2 border-secondary/50">
              <div className="text-sm text-muted-foreground">УНИЧТОЖЕНО</div>
              <div className="text-3xl font-bold text-secondary" style={{ textShadow: '0 0 10px #ff00ff' }}>
                {destroyed}
              </div>
            </div>
          </div>

          {gameStarted && (
            <>
              <div
                className="absolute transition-all duration-75"
                style={{
                  left: shipPos.x - SHIP_SIZE / 2,
                  top: shipPos.y - SHIP_SIZE / 2,
                  width: SHIP_SIZE,
                  height: SHIP_SIZE,
                }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent rounded-t-full"
                       style={{ 
                         clipPath: 'polygon(50% 0%, 0% 100%, 50% 85%, 100% 100%)',
                         boxShadow: '0 0 20px #00ffff, inset 0 0 10px #00ffff'
                       }} 
                  />
                  <div className="absolute bottom-0 left-1/4 w-2 h-3 bg-accent rounded-full"
                       style={{ boxShadow: '0 0 10px #ff00ff' }} 
                  />
                  <div className="absolute bottom-0 right-1/4 w-2 h-3 bg-accent rounded-full"
                       style={{ boxShadow: '0 0 10px #ff00ff' }} 
                  />
                </div>
              </div>

              {missiles.map(missile => (
                <div
                  key={missile.id}
                  className="absolute bg-gradient-to-t from-secondary via-accent to-transparent rounded-full"
                  style={{
                    left: missile.x - MISSILE_WIDTH / 2,
                    top: missile.y,
                    width: MISSILE_WIDTH,
                    height: MISSILE_HEIGHT,
                    boxShadow: '0 0 15px #ff00ff, 0 0 5px #ff00ff'
                  }}
                />
              ))}

              {asteroids.map(asteroid => (
                <div
                  key={asteroid.id}
                  className="absolute rounded-full bg-gradient-radial"
                  style={{
                    left: asteroid.x - ASTEROID_SIZE / 2,
                    top: asteroid.y - ASTEROID_SIZE / 2,
                    width: ASTEROID_SIZE,
                    height: ASTEROID_SIZE,
                    background: 'radial-gradient(circle, #ff6b35 0%, #f7931e 50%, #c73e1d 100%)',
                    boxShadow: '0 0 20px #ff6b35, inset 0 0 10px rgba(0,0,0,0.5)'
                  }}
                />
              ))}

              {particles.map(particle => (
                <div
                  key={particle.id}
                  className="absolute rounded-full"
                  style={{
                    left: particle.x,
                    top: particle.y,
                    width: 3,
                    height: 3,
                    backgroundColor: particle.life > 0.5 ? '#00ffff' : '#ff00ff',
                    opacity: particle.life,
                    boxShadow: `0 0 ${particle.life * 10}px ${particle.life > 0.5 ? '#00ffff' : '#ff00ff'}`
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
