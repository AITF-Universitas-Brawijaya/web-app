"use client"

import { Pie } from "react-chartjs-2"
import { Card } from "@/components/ui/Card"

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

interface PieBaseProps {
    title: string
    labels: string[]
    values: number[]
}

const COLORS = ["#1DC0EB", "#00336A", "#0B88D3", "#003F81"]

export default function PieBaseChart({ title, labels, values }: PieBaseProps) {
    const data = {
        labels,
        datasets: [
            {
                label: title,
                data: values,
                backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
                borderWidth: 1,
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false, // legend kita bikin manual
            },
            tooltip: {
                enabled: true,
            },
        },
    }

    return (
        <Card className="p-4">
            <h2 className="text-base font-semibold mb-3">{title}</h2>

            <div className="flex items-center justify-center gap-6">
                {/* Legend vertikal di samping chart */}
                <div className="flex flex-col gap-2 text-sm">
                    {labels.map((label, idx) => (
                        <div key={label} className="flex items-center gap-2">
                            <span
                                className="inline-block w-3 h-3 rounded-sm"
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Pie chart */}
                <div className="h-[260px] w-[260px]">
                    <Pie data={data} options={options} />
                </div>
            </div>
        </Card>
    )
}
