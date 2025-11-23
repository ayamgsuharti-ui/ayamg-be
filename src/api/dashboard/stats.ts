import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export default async function getStats(req: Request, res: Response) {
  try {
    // 1. Hitung Pendapatan Hari Ini (LUNAS)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Set ke awal hari berikutnya

    const pendapatanHariIni = await prisma.orders.aggregate({
      _sum: {
        total_harga: true,
      },
      where: {
        status_pembayaran: 'LUNAS',
        waktu_order: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 2. Hitung Jumlah Pesanan Baru (BELUM_BAYAR)
    const jumlahPesananBaru = await prisma.orders.count({
      where: {
        status_pembayaran: 'BELUM_BAYAR',
      },
    });

    // 3. Cari Menu Terlaris
    const menuTerlarisAgg = await prisma.orderitems.groupBy({
      by: ['produk_id'],
      _sum: {
        jumlah: true,
      },
      orderBy: {
        _sum: {
          jumlah: 'desc',
        },
      },
      take: 1,
    });

    let menuTerlaris = null;
    if (menuTerlarisAgg.length > 0) {
      const produkId = menuTerlarisAgg[0].produk_id;
      menuTerlaris = await prisma.produk.findUnique({
        where: { id: produkId },
        select: { nama_produk: true },
      });
    }

    res.json({
      pendapatanHariIni: pendapatanHariIni._sum.total_harga || 0,
      jumlahPesananBaru: jumlahPesananBaru,
      menuTerlaris: menuTerlaris?.nama_produk || 'Belum ada',
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Gagal mengambil statistik" });
  }
}
