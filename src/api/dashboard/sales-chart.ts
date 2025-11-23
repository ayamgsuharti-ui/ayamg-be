import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export default async function getSalesChartData(req: Request, res: Response) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sales = await prisma.orders.findMany({
      where: {
        status_pembayaran: 'LUNAS',
        waktu_order: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        waktu_order: true,
        total_harga: true,
      },
      orderBy: {
        waktu_order: 'asc',
      }
    });

    // Proses data untuk format grafik
    const dailySales: { [key: string]: number } = {};
    const labels: string[] = [];

    // Buat label untuk 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        labels.push(label);
        dailySales[label] = 0;
    }

    sales.forEach((sale: any) => {
        const dateLabel = sale.waktu_order.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        if (dailySales[dateLabel] !== undefined) {
            dailySales[dateLabel] += sale.total_harga;
        }
    });

    const chartData = labels.map(label => ({
        name: label,
        total: dailySales[label],
    }));

    res.json(chartData);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Gagal mengambil statistik" });
  }
}
