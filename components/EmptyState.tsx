export function EmptyState({
  icon,
  title,
  action,
}: {
  icon: string
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-gray-500 mb-4">{title}</p>
      {action}
    </div>
  )
}