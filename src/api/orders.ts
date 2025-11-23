import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import type { orders_tipe_pesanan, orders_status_pembayaran, pembayaran_status, orders_status_pesanan } from "@prisma/client";

const prisma = new PrismaClient();

export async function getOrders(req: Request, res: Response) {
  try {
    const orders = await prisma.orders.findMany({
      orderBy: {
        waktu_order: 'desc',
      },
      include: {
        orderitems: {
          include: {
            produk: true,
          },
        },
        pembayaran: {
          orderBy: {
            waktu_bayar: 'desc',
          },
          include: {
            metodepembayaran: true,
          },
        },
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil data pesanan" });
  }
}

type CartItemClient = {
  id: number;
  harga: number;
  jumlah: number;
}

export async function createOrder(req: Request, res: Response) {
  try {
    const {
      cartItems,
      nama_pelanggan,
      nomor_wa,
      total_harga,
      catatan_pelanggan,
      metode_pembayaran_id,
      tipe_pesanan
    }: {
      cartItems: CartItemClient[],
      nama_pelanggan: string,
      nomor_wa: string,
      total_harga: number,
      catatan_pelanggan?: string,
      metode_pembayaran_id?: number,
      tipe_pesanan: orders_tipe_pesanan
    } = req.body;

    console.log("Create Order Payload:", JSON.stringify(req.body, null, 2));

    if (!cartItems || cartItems.length === 0 || !tipe_pesanan) {
      return res.status(400).json({ message: "Data tidak lengkap." });
    }

    let finalMetodeId = metode_pembayaran_id;

    // Auto-assign Pakasir for ONLINE if not provided
    if (!finalMetodeId && tipe_pesanan === 'ONLINE') {
      let pakasirMethod = await prisma.metodepembayaran.findFirst({ where: { nama_metode: 'Pakasir' } });
      if (!pakasirMethod) {
        pakasirMethod = await prisma.metodepembayaran.create({ data: { nama_metode: 'Pakasir' } });
      }
      finalMetodeId = pakasirMethod.id;
    }

    if (!finalMetodeId) {
      return res.status(400).json({ message: "Metode pembayaran harus dipilih." });
    }

    const finalNamaPelanggan = nama_pelanggan || 'Pelanggan di Tempat';
    const finalNomorWa = nomor_wa || '-';

    const metodePembayaran = await prisma.metodepembayaran.findUnique({
      where: { id: finalMetodeId },
    });

    if (!metodePembayaran) {
      return res.status(400).json({ message: "Metode pembayaran tidak valid." });
    }

    let finalStatusPembayaran: orders_status_pembayaran = 'BELUM_BAYAR';
    let finalStatusDiPembayaran: pembayaran_status = 'PENDING';

    if (tipe_pesanan === 'OFFLINE' && metodePembayaran.nama_metode.toLowerCase() === 'cash') {
      finalStatusPembayaran = 'LUNAS';
      finalStatusDiPembayaran = 'SUCCESS';
    }

    const createdOrder = await prisma.$transaction(async (prisma) => {
      const newOrder = await prisma.orders.create({
        data: {
          nama_pelanggan: finalNamaPelanggan,
          nomor_wa: finalNomorWa,
          total_harga,
          catatan_pelanggan,
          tipe_pesanan: tipe_pesanan,
          status_pembayaran: finalStatusPembayaran,
        },
      });

      const orderItemsData = cartItems.map((item) => ({
        order_id: newOrder.id,
        produk_id: item.id,
        jumlah: item.jumlah,
        subtotal: item.harga * item.jumlah,
      }));
      await prisma.orderitems.createMany({ data: orderItemsData });

      await prisma.pembayaran.create({
        data: {
          order_id: newOrder.id,
          metode_id: finalMetodeId!,
          jumlah_bayar: total_harga,
          status: finalStatusDiPembayaran
        }
      });

      return newOrder;
    });

    // --- PAKASIR INTEGRATION ---
    let paymentUrl = null;
    if (tipe_pesanan === 'ONLINE' && finalStatusPembayaran === 'BELUM_BAYAR') {
      const slug = process.env.PAKASIR_PROJECT_SLUG;
      // Construct redirect URL (frontend URL)
      // Assuming frontend is running on same host but different port or we use referer
      // For now hardcode localhost:3000 or use env if available. 
      // Better: use a generic success page or the order detail page.
      const redirectUrl = `http://localhost:3000/pesanan/${createdOrder.id}`;

      paymentUrl = `https://app.pakasir.com/pay/${slug}/${Math.ceil(total_harga)}?order_id=${createdOrder.id}&redirect=${encodeURIComponent(redirectUrl)}`;
    }

    res.status(201).json({ ...createdOrder, paymentUrl });
  } catch (error) {
    console.error("Gagal membuat pesanan:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat membuat pesanan" });
  }
}

export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);

    const { nomorWa } = req.query;

    const whereClause: { id: number; nomor_wa?: string } = {
      id: numericId
    };

    if (nomorWa) {
      whereClause.nomor_wa = nomorWa as string;
    }

    const order = await prisma.orders.findUnique({
      where: whereClause,
      include: {
        orderitems: { include: { produk: true } },
        pembayaran: {
          include: { metodepembayaran: true },
          orderBy: { waktu_bayar: 'desc' }
        }
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan atau Anda tidak punya akses" });
    }

    res.json(order);
  } catch (error: unknown) {
    console.error("Gagal mengambil data pesanan:", error);
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "Gagal mengambil data pesanan" });
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    const {
      status_pembayaran,
      status_pesanan,
      keterangan_batal,
      metode_pembayaran_id
    }: {
      status_pembayaran: orders_status_pembayaran,
      status_pesanan: orders_status_pesanan,
      keterangan_batal?: string,
      metode_pembayaran_id?: number
    } = req.body;

    if (metode_pembayaran_id) {
      const pembayaranTerbaru = await prisma.pembayaran.findFirst({
        where: { order_id: numericId },
        orderBy: { waktu_bayar: 'desc' }
      });

      if (pembayaranTerbaru) {
        await prisma.pembayaran.update({
          where: { id: pembayaranTerbaru.id },
          data: { metode_id: metode_pembayaran_id }
        });
      }
    }

    const dataToUpdate: {
      status_pembayaran: orders_status_pembayaran;
      status_pesanan?: orders_status_pesanan;
      keterangan_batal?: string | null;
    } = {
      status_pembayaran,
    };

    if (status_pembayaran === 'BATAL') {
      dataToUpdate.keterangan_batal = keterangan_batal || "Dibatalkan oleh admin.";
    } else {
      dataToUpdate.keterangan_batal = null;
    }

    if (status_pesanan) {
      dataToUpdate.status_pesanan = status_pesanan;
    }

    const updatedOrder = await prisma.orders.update({
      where: { id: numericId },
      data: dataToUpdate,
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengupdate status" });
  }
}

export async function getOrdersByWa(req: Request, res: Response) {
  try {
    const { nomorWa } = req.params;

    const orders = await prisma.orders.findMany({
      where: {
        nomor_wa: nomorWa,
      },
      orderBy: {
        waktu_order: 'desc',
      },
    });

    res.json(orders);
  } catch (error) {
    console.error("Gagal mengambil data pesanan by WA:", error);
    res.status(500).json({ message: "Gagal mengambil data pesanan" });
  }
}

export async function getNewOrderCount(req: Request, res: Response) {
  try {
    const newOrderCount = await prisma.orders.count({
      where: {
        status_pembayaran: {
          in: ['MENUNGGU_KONFIRMASI', 'BELUM_BAYAR']
        }
      },
    });

    res.json({ count: newOrderCount });
  } catch (error) {
    console.error("Error fetching:", error);
  }
}

export async function checkOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);

    const order = await prisma.orders.findUnique({
      where: { id: numericId },
      include: { pembayaran: true }
    });

    if (!order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    if (order.status_pembayaran === 'LUNAS') {
      return res.json({ message: "Pesanan sudah lunas", status: 'LUNAS' });
    }

    // Call Pakasir API
    const slug = process.env.PAKASIR_PROJECT_SLUG;
    const apiKey = process.env.PAKASIR_API_KEY;
    const amount = Math.ceil(order.total_harga);

    // Pakasir API URL
    const url = `https://app.pakasir.com/api/transactiondetail?project=${slug}&amount=${amount}&order_id=${order.id}&api_key=${apiKey}`;

    console.log("Checking Pakasir Status:", url);

    const response = await fetch(url);
    const data = await response.json() as any;

    console.log("Pakasir Response:", data);

    if (data && data.transaction && data.transaction.status === 'completed') {
      // Update to LUNAS
      await prisma.orders.update({
        where: { id: numericId },
        data: {
          status_pembayaran: 'LUNAS',
          status_pesanan: 'PESANAN_DITERIMA',
        },
      });

      // Update payment record if exists, or create one
      const pembayaran = await prisma.pembayaran.findFirst({ where: { order_id: numericId } });
      if (pembayaran) {
        await prisma.pembayaran.update({
          where: { id: pembayaran.id },
          data: { status: 'SUCCESS' }
        });
      }

      return res.json({ message: "Pembayaran berhasil dikonfirmasi", status: 'LUNAS' });
    }

    return res.json({ message: "Pembayaran belum diterima", status: order.status_pembayaran });

  } catch (error) {
    console.error("Error checking order status:", error);
    res.status(500).json({ message: "Gagal mengecek status pembayaran" });
  }
}
