interface AnimatedBackdropProps {
  className?: string
}

export default function AnimatedBackdrop({ className = '' }: AnimatedBackdropProps) {
  return (
    <div className={`app-ambient-bg ${className}`}>
      <span className="ambient-shape ambient-shape-1" />
      <span className="ambient-shape ambient-shape-2" />
      <span className="ambient-shape ambient-shape-3" />
      <span className="ambient-grid" />
    </div>
  )
}
