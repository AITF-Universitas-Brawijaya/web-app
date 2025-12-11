"use client"

import { Line } from "react-chartjs-2"
import { Card } from "@/components/ui/Card"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)


// ---- FIX: Tambah tipe props ----
interface LineBaseProps {
  title: string
  labels: string[]
  values: number[]
}

export default function LineBaseChart({ title, labels, values }: LineBaseProps) {
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        borderColor: "#1DC0EB",
        backgroundColor: "#1DC0EB33",
        tension: 0.3,
      },
    ],
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold mb-2">{title}</h2>
      <Line data={data} />
    </Card>
  )
}
