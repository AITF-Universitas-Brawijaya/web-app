"use client"
import { Bar } from "react-chartjs-2"
import { Card } from "@/components/ui/Card"

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface BarBaseProps {
    title: string
    labels: string[]
    values: number[]
}

export default function BarBase({ title, labels, values }: BarBaseProps) {
    const data = {
        labels,
        datasets: [
            {
                label: title,
                data: values,
                backgroundColor: "#003D7D",
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top" as const,
            },
        },
    }

    return (
        <Card className="p-4 flex flex-col justify-center">
            <h2 className="text-base font-semibold mb-3">{title}</h2>

            <div className="flex items-center justify-center flex-1 min-h-[300px]">
                <div className="w-full max-w-lg h-[260px]">
                    <Bar data={data} options={options} />
                </div>
            </div>
        </Card>
    )

}
