"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from "recharts";
import { PRODUIT_LABELS } from "@/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

interface AdminChartsProps {
    dataByBank: Array<{ name: string; value: number; color?: string }>;
    dataByProduct: Array<{ name: string; value: number }>;
    dataByStatus: Array<{ name: string; value: number }>;
    mainChartTitle: string;
}

export function AdminCharts({ dataByBank, dataByProduct, dataByStatus, mainChartTitle }: AdminChartsProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Volume par Banque / Agence */}
                <div className="lg:col-span-2">
                    <Card className="border-0 h-full flex flex-col justify-between">
                        <CardHeader className="border-b border-gray-50 pb-3 pt-4 px-5">
                            <CardTitle className="text-base font-bold text-gray-900">{mainChartTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-5 pb-4 flex-1 flex items-center justify-center">
                            <div className="h-[265px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataByBank} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: "#6b7280", fontSize: 11 }}
                                            axisLine={{ stroke: "#e5e7eb" }}
                                            tickLine={false}
                                            angle={-30}
                                            textAnchor="end"
                                            interval={0}
                                            height={45}
                                        />
                                        <YAxis
                                            tick={{ fill: "#6b7280", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "#f9fafb" }}
                                            contentStyle={{
                                                backgroundColor: "white",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                            {dataByBank.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Stacked Cards */}
                <div className="flex flex-col gap-4 lg:col-span-1">
                    {/* Répartition par Produit */}
                    <Card className="border-0 flex-1 flex flex-col justify-between">
                        <CardHeader className="border-b border-gray-50 pb-2 pt-3 px-4">
                            <CardTitle className="text-sm font-bold text-gray-900">Répartition par Produit</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2 px-4 pb-2 flex-1 flex items-center justify-center">
                            <div className="h-[120px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dataByProduct}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={45}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {dataByProduct.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "white",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "6px",
                                            }}
                                        />
                                        <Legend
                                            align="center"
                                            verticalAlign="bottom"
                                            layout="horizontal"
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* État des Dossiers */}
                    <Card className="border-0 flex-1 flex flex-col justify-between">
                        <CardHeader className="border-b border-gray-50 pb-2 pt-3 px-4">
                            <CardTitle className="text-sm font-bold text-gray-900">État des Dossiers</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2 px-4 pb-2 flex-1 flex items-center justify-center">
                            <div className="h-[120px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataByStatus} layout="vertical" margin={{ top: 2, right: 10, left: 5, bottom: 2 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            tick={{ fill: "#6b7280", fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={60}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "#f9fafb" }}
                                            contentStyle={{
                                                backgroundColor: "white",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "6px",
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={10}>
                                            {dataByStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={
                                                    entry.name === "Validée" ? "#10b981" :
                                                        entry.name === "Convertie" ? "#3b82f6" :
                                                            entry.name === "Brouillon" ? "#9ca3af" : "#f59e0b"
                                                } />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
