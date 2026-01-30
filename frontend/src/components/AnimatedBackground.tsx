import { motion } from "framer-motion";

const orbs = [
  { size: 300, x: "10%", y: "20%", color: "rgba(139,92,246,0.15)", duration: 20 },
  { size: 250, x: "70%", y: "10%", color: "rgba(34,211,238,0.12)", duration: 25 },
  { size: 200, x: "80%", y: "60%", color: "rgba(139,92,246,0.10)", duration: 22 },
  { size: 350, x: "30%", y: "70%", color: "rgba(34,211,238,0.08)", duration: 28 },
  { size: 150, x: "50%", y: "40%", color: "rgba(139,92,246,0.12)", duration: 18 },
];

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-zinc-950">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
