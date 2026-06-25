"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface PremiumStatsCardProps {
  label: string;
  value: string | number;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  gradient: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  chartColor: string;
  amount?: string;
  chartData?: Array<{ value: number }>;
}

export function PremiumStatsCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  gradient,
  bgColor,
  borderColor,
  textColor,
  chartColor,
  amount,
  chartData,
}: PremiumStatsCardProps) {
  const defaultChartData = Array.from({ length: 7 }, (_, i) => ({
    value: (typeof value === "number" ? value : 0) + Math.random() * 10 - 5,
  }));

  const data = chartData || defaultChartData;

  return (
    <Card 
      className={`border-2 ${borderColor} ${bgColor} hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden relative`}
    >
      <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-20 -mt-20 group-hover:opacity-20 transition-opacity`} />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-md`}>
            <Icon className={`h-6 w-6 ${textColor}`} />
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm ${trend === "up" ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{change}</span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {amount && (
            <p className="text-xs font-medium text-gray-500">{amount}</p>
          )}
        </div>

        {/* Mini Chart */}
        <div className="h-16 -mx-6 -mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor} 
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className={`h-4 w-4 ${textColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}




