"use client"

import { Card } from "@/components/ui/Card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/Chart"
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { LinkRecord } from "@/types/linkRecord"

export default function TpFpChart({ data }: { data: LinkRecord[] }) {
  const tp = data.filter((d) => d.status === "verified").length
  const fp = data.filter((d) => d.status === "false-positive").length
  const rows = [
    { name: "True Positive", value: tp },
    { name: "False Positive", value: fp },
  ]
  const colors = ["hsl(var(--chart-2))", "hsl(var(--destructive))"]

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">Rasio True Positive vs False Positive</h3>
      <ChartContainer config={{}} className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie dataKey="value" data={rows} label>
              {rows.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  )
}
