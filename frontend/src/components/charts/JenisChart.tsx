"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/Card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/Chart"
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { LinkRecord, Jenis } from "@/types/linkRecord"

export default function JenisChart({ data }: { data: LinkRecord[] }) {
  const counts = useMemo(() => {
    const acc: Record<Jenis, number> = { Judi: 0, Pornografi: 0, Penipuan: 0 }
    data.forEach((d) => (acc[d.jenis] += 1))
    return Object.entries(acc).map(([name, value]) => ({ name, value }))
  }, [data])

  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--chart-5))"]

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">Distribusi Jenis Konten</h3>
      <ChartContainer config={{}} className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie dataKey="value" data={counts} label>
              {counts.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  )
}
