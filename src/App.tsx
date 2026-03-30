import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Float, Text, RoundedBox, ContactShadows } from '@react-three/drei'
import { Suspense, useState, useRef, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// Types
interface Task {
  id: string
  title: string
  color: string
  column: 'todo' | 'doing' | 'done'
}

// Pastel color palette
const COLORS = {
  todo: '#FFB5BA',      // Soft coral
  doing: '#B5D8FF',     // Soft blue
  done: '#C1F0B5',      // Soft green
  accent: '#FFE5B5',    // Soft gold
  bg: '#1a1625',        // Deep purple-black
}

const COLUMN_POSITIONS: Record<string, number> = {
  todo: -4,
  doing: 0,
  done: 4,
}

const COLUMN_LABELS: Record<string, string> = {
  todo: 'To Do',
  doing: 'In Progress',
  done: 'Complete',
}

// Animated floating platform for each column
function ColumnPlatform({ column, color, isHovered }: { column: string; color: string; isHovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = -2 + Math.sin(state.clock.elapsedTime * 0.5 + COLUMN_POSITIONS[column]) * 0.1
    }
  })

  return (
    <group position={[COLUMN_POSITIONS[column], 0, 0]}>
      <mesh ref={meshRef} position={[0, -2, 0]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.5, 0.3, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.4 : 0.15}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, -1.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.3, 0.05, 16, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Column label */}
      <Text
        position={[0, -2.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/fredokaone/v8/k3kUo8kEI-tA1RRcTZGmTlHGCaen8wf-.woff"
      >
        {COLUMN_LABELS[column]}
      </Text>
    </group>
  )
}

// Individual task card as a 3D floating element
function TaskCard({
  task,
  index,
  totalInColumn,
  onDragStart,
  isDragging,
  isSelected,
  onClick
}: {
  task: Task
  index: number
  totalInColumn: number
  onDragStart: (taskId: string) => void
  isDragging: boolean
  isSelected: boolean
  onClick: (taskId: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Group>(null!)

  const yOffset = 1 - index * 1.2
  const basePosition: [number, number, number] = [COLUMN_POSITIONS[task.column], yOffset, 0]

  useFrame((state) => {
    if (meshRef.current && !isDragging) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.05
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.4 + index) * 0.02
    }
  })

  return (
    <Float
      speed={2}
      rotationIntensity={isDragging ? 0 : 0.1}
      floatIntensity={isDragging ? 0 : 0.3}
      floatingRange={[-0.1, 0.1]}
    >
      <group
        ref={meshRef}
        position={basePosition}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default' }}
        onClick={(e) => { e.stopPropagation(); onClick(task.id) }}
        scale={hovered ? 1.08 : isSelected ? 1.05 : 1}
      >
        <RoundedBox
          args={[2.8, 0.9, 0.15]}
          radius={0.12}
          smoothness={4}
          castShadow
        >
          <meshStandardMaterial
            color={task.color}
            emissive={task.color}
            emissiveIntensity={hovered ? 0.3 : isSelected ? 0.25 : 0.1}
            roughness={0.4}
            metalness={0.05}
          />
        </RoundedBox>
        {/* Card shine effect */}
        <mesh position={[0, 0.2, 0.08]}>
          <planeGeometry args={[2.4, 0.15]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.15}
          />
        </mesh>
        {/* Task text */}
        <Text
          position={[0, 0, 0.1]}
          fontSize={0.18}
          color="#2d2d2d"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.4}
          font="https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshdTk3j77e.woff2"
        >
          {task.title}
        </Text>
        {/* Selection indicator */}
        {isSelected && (
          <mesh position={[0, 0, -0.1]}>
            <planeGeometry args={[3, 1.1]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.5}
              transparent
              opacity={0.3}
            />
          </mesh>
        )}
      </group>
    </Float>
  )
}

// Particle system for ambient atmosphere
function Particles() {
  const count = 50
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return pos
  }, [])

  const ref = useRef<THREE.Points>(null!)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#FFE5B5"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

// Main 3D Scene
function Scene({
  tasks,
  selectedTask,
  onTaskSelect,
  hoveredColumn,
  setHoveredColumn
}: {
  tasks: Task[]
  selectedTask: string | null
  onTaskSelect: (id: string | null) => void
  hoveredColumn: string | null
  setHoveredColumn: (col: string | null) => void
}) {
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = { todo: [], doing: [], done: [] }
    tasks.forEach(task => {
      grouped[task.column].push(task)
    })
    return grouped
  }, [tasks])

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFE5B5" />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#B5D8FF" />
      <spotLight
        position={[0, 10, 5]}
        angle={0.5}
        penumbra={1}
        intensity={0.8}
        color="#ffffff"
        castShadow
      />

      <Particles />

      {/* Column platforms */}
      {(['todo', 'doing', 'done'] as const).map((column) => (
        <group
          key={column}
          onPointerOver={() => setHoveredColumn(column)}
          onPointerOut={() => setHoveredColumn(null)}
        >
          <ColumnPlatform
            column={column}
            color={COLORS[column]}
            isHovered={hoveredColumn === column}
          />
        </group>
      ))}

      {/* Task cards */}
      {Object.entries(tasksByColumn).map(([column, columnTasks]) =>
        columnTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            totalInColumn={columnTasks.length}
            onDragStart={() => {}}
            isDragging={false}
            isSelected={selectedTask === task.id}
            onClick={onTaskSelect}
          />
        ))
      )}

      <ContactShadows
        position={[0, -2.3, 0]}
        opacity={0.4}
        scale={15}
        blur={2.5}
        far={4}
      />

      <Environment preset="city" />
      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}

// UI Overlay Components
function TaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a new task..."
        className="flex-1 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FFE5B5]/50 focus:border-transparent transition-all text-sm md:text-base"
      />
      <button
        type="submit"
        className="px-4 md:px-6 py-3 rounded-xl bg-gradient-to-r from-[#FFB5BA] to-[#FFE5B5] text-[#1a1625] font-semibold hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-[#FFB5BA]/30 text-sm md:text-base whitespace-nowrap"
      >
        Add Task
      </button>
    </form>
  )
}

function ColumnButtons({
  selectedTask,
  onMove
}: {
  selectedTask: string | null
  onMove: (column: 'todo' | 'doing' | 'done') => void
}) {
  if (!selectedTask) return null

  return (
    <div className="flex gap-2 justify-center flex-wrap">
      <span className="text-white/60 text-xs md:text-sm self-center mr-1 md:mr-2">Move to:</span>
      {(['todo', 'doing', 'done'] as const).map((col) => (
        <button
          key={col}
          onClick={() => onMove(col)}
          className="px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: COLORS[col],
            color: '#1a1625'
          }}
        >
          {COLUMN_LABELS[col]}
        </button>
      ))}
    </div>
  )
}

// Main App Component
export default function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Design the landing page', color: '#FFB5BA', column: 'todo' },
    { id: '2', title: 'Set up database schema', color: '#B5D8FF', column: 'todo' },
    { id: '3', title: 'Write API endpoints', color: '#C1F0B5', column: 'doing' },
    { id: '4', title: 'Create user authentication', color: '#FFE5B5', column: 'doing' },
    { id: '5', title: 'Deploy to production', color: '#FFB5BA', column: 'done' },
  ])

  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)

  const cardColors = ['#FFB5BA', '#B5D8FF', '#C1F0B5', '#FFE5B5', '#E5B5FF']

  const addTask = useCallback((title: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      color: cardColors[Math.floor(Math.random() * cardColors.length)],
      column: 'todo'
    }
    setTasks(prev => [...prev, newTask])
  }, [])

  const moveTask = useCallback((column: 'todo' | 'doing' | 'done') => {
    if (!selectedTask) return
    setTasks(prev => prev.map(task =>
      task.id === selectedTask ? { ...task, column } : task
    ))
    setSelectedTask(null)
  }, [selectedTask])

  const deleteTask = useCallback(() => {
    if (!selectedTask) return
    setTasks(prev => prev.filter(task => task.id !== selectedTask))
    setSelectedTask(null)
  }, [selectedTask])

  const handleTaskSelect = useCallback((id: string | null) => {
    setSelectedTask(prev => prev === id ? null : id)
  }, [])

  return (
    <div className="w-screen h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1625 0%, #2d1f3d 50%, #1a2535 100%)' }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #FFB5BA 0%, transparent 70%)' }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #B5D8FF 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #FFE5B5 0%, transparent 60%)' }} />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Fredoka One', cursive" }}>
            <span className="bg-gradient-to-r from-[#FFB5BA] via-[#FFE5B5] to-[#B5D8FF] bg-clip-text text-transparent">
              Kanban Buddy
            </span>
          </h1>
          <p className="text-white/50 text-xs md:text-sm mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Click a task to select, then move it between columns
          </p>
        </div>
      </header>

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 4, 12], fov: 50 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Scene
            tasks={tasks}
            selectedTask={selectedTask}
            onTaskSelect={handleTaskSelect}
            hoveredColumn={hoveredColumn}
            setHoveredColumn={setHoveredColumn}
          />
        </Suspense>
      </Canvas>

      {/* Control Panel */}
      <div className="absolute bottom-16 left-0 right-0 z-10 p-4 md:p-6">
        <div className="max-w-xl mx-auto space-y-3 md:space-y-4">
          <TaskInput onAdd={addTask} />
          <ColumnButtons selectedTask={selectedTask} onMove={moveTask} />
          {selectedTask && (
            <div className="flex justify-center">
              <button
                onClick={deleteTask}
                className="px-4 py-2 rounded-lg text-xs md:text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all"
              >
                Delete Selected Task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 p-3 md:p-4 text-center">
        <p className="text-white/30 text-[10px] md:text-xs" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Requested by @web-user · Built by @clonkbot
        </p>
      </footer>
    </div>
  )
}
