import { Button } from "@/components/ui/Button"

export function FilterMenu({ value, onApply }: { value: string[]; onApply: (v: string[]) => void }) {
  const opts = ["Judi", "Pornografi", "Penipuan"]

  return (
    <div className="flex items-center gap-2">
      {opts.map((o) => {
        const active = value.includes(o)
        return (
          <Button
            key={o}
            size="sm"
            variant="secondary"
            className={active ? "bg-muted text-foreground" : "bg-card text-foreground/80 border border-border"}
            onClick={() => {
              if (active) onApply(value.filter((v) => v !== o))
              else onApply([...value, o])
            }}
          >
            {o}
          </Button>
        )
      })}
    </div>
  )
}
