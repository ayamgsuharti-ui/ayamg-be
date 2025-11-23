import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function pakasirWebhook(req: Request, res: Response) {
    try {
        const { order_id, status, payment_method, amount } = req.body;

        console.log("Webhook Pakasir received:", req.body);

        if (!order_id || !status) {
            return res.status(400).json({ message: "Invalid payload" });
        }

        const numericOrderId = parseInt(order_id);

        // Cek order ada atau tidak
        const order = await prisma.orders.findUnique({
            where: { id: numericOrderId },
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (status === 'completed') {
            // Update status order jadi LUNAS
            await prisma.orders.update({
                where: { id: numericOrderId },
                data: {
                    status_pembayaran: 'LUNAS',
                    status_pesanan: 'PESANAN_DITERIMA', // Atau biarkan status sebelumnya jika sudah diproses
                },
            });

            // Catat pembayaran di tabel pembayaran
            // Cari metode pembayaran ID berdasarkan nama (atau default ke 'Online')
            // Untuk simplifikasi, kita cari atau buat metode 'Pakasir'
            let metode = await prisma.metodepembayaran.findFirst({
                where: { nama_metode: 'Pakasir' }
            });

            if (!metode) {
                metode = await prisma.metodepembayaran.create({
                    data: { nama_metode: 'Pakasir' }
                });
            }

            await prisma.pembayaran.create({
                data: {
                    order_id: numericOrderId,
                    metode_id: metode.id,
                    jumlah_bayar: Number(amount),
                    status: 'SUCCESS',
                    kode_referensi: payment_method, // Simpan metode (qris/va) di sini
                    waktu_bayar: new Date(),
                }
            });

            console.log(`Order #${order_id} marked as LUNAS via Pakasir.`);
        } else if (status === 'failed') {
            await prisma.orders.update({
                where: { id: numericOrderId },
                data: {
                    status_pembayaran: 'BATAL', // Atau status lain
                },
            });
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
