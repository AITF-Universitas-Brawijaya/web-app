import { Button } from "@/components/ui/Button"

export function PerPage({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [10, 20, 50]
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground/70">Rows:</span>
      <div className="flex items-center gap-1">
        {options.map((opt) => (
          <Button
            key={opt}
            variant={opt === value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(opt)}
            style={opt === value ? {
              background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)',
              color: 'white',
              border: 'none'
            } : undefined}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  )
}
