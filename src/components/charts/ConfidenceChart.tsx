"use client"

import { Card } from "@/components/ui/Card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/Chart"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts"
import { LinkRecord } from "@/types/linkRecord"

export default function ConfidenceChart({ data }: { data: LinkRecord[] }) {
  const bins = { "<85%": 0, "85-94%": 0, ">=95%": 0 }
  data.forEach((d) => {
    if (d.kepedean < 85) bins["<85%"]++
    else if (d.kepedean < 95) bins["85-94%"]++
    else bins[">=95%"]++
  })
  const rows = Object.entries(bins).map(([bucket, value]) => ({ bucket, value }))

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">Distribusi Skor Kepercayaan</h3>
      <ChartContainer config={{}} className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  )
}
