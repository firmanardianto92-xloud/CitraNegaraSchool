import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";

export default function TrenNilai({ studentId }) {
  const tren = useQuery({
    queryKey: ["tren", studentId],
    queryFn: () => apiGet(`/grades/tren/${studentId}`),
    enabled: Boolean(studentId),
  });
  const data = tren.data;
  const series = data?.mapel_series ?? [];
  const kkm = data?.kkm ?? 75;
  const selisih = data?.selisih_terakhir ?? 0;
  const naik = selisih >= 0;

  return (
    <Card className="border-[#E2E8F0]" data-testid="tren-card">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">Grafik Perkembangan Nilai</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Rata-rata nilai antar semester. Garis putus-putus = KKM {kkm}.
            </p>
          </div>
          {series.length > 1 ? (
            <Badge
              className={naik ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"}
              data-testid="tren-selisih"
            >
              {naik ? <TrendingUp className="mr-1 inline h-3.5 w-3.5" /> : <TrendingDown className="mr-1 inline h-3.5 w-3.5" />}
              {naik ? "+" : ""}{selisih} dari semester lalu
            </Badge>
          ) : null}
        </div>

        {series.length === 0 ? (
          <p className="mt-6 text-sm text-[#64748B]" data-testid="tren-empty-state">
            Belum ada riwayat nilai untuk digambarkan.
          </p>
        ) : (
          <>
            <div className="mt-6 h-72 w-full" data-testid="tren-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 24, bottom: 4, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="semester"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    stroke="#CBD5E1"
                    interval={0}
                    padding={{ left: 44, right: 44 }}
                  />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 12, fill: "#64748B" }} stroke="#CBD5E1" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
                    formatter={(v, n) => [v, n]}
                  />
                  <ReferenceLine y={kkm} stroke="#B91C1C" strokeDasharray="6 4" />
                  <Line
                    type="monotone"
                    dataKey="Rata-rata"
                    stroke="#1E3A8A"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#F59E0B", strokeWidth: 0 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3" data-testid="tren-semester-list">
              {(data?.semesters ?? []).map((s) => (
                <div key={s.semester} className="rounded-xl border border-[#E2E8F0] p-4" data-testid={`tren-sem-${s.semester.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">{s.semester}</p>
                  <p className="mt-1 font-heading text-2xl font-bold">{s.rata_rata}</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Predikat {s.predikat} · {s.jumlah_merah} nilai merah dari {s.jumlah_mapel} mapel
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
