interface AvatarDiceBearProps {
  seed: string
  size?: number
  className?: string
  style?: string
}

export function AvatarDiceBear({ seed, size = 96, className = '', style = 'bottts' }: AvatarDiceBearProps) {
  const encodedSeed = encodeURIComponent(seed || 'default')
  const src = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedSeed}&radius=50`

  return (
    <img
      src={src}
      alt="Avatar"
      width={size}
      height={size}
      className={`rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}
    />
  )
}
