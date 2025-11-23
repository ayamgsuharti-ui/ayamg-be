import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';

const prisma = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_KEY as string);

export default async function konfirmasiPembayaran(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const numericOrderId = parseInt(orderId);
    
    // Asumsi menggunakan middleware seperti multer untuk menangani form-data
    const gambar = req.file;

    if (!gambar) {
      return res.status(400).json({ message: "Bukti bayar diperlukan" });
    }

    const namaFile = Date.now() + "_" + gambar.originalname;
    const { error: uploadError } = await supabase.storage
      .from('bukti-pembayaran')
      .upload(namaFile, gambar.buffer, {
        contentType: gambar.mimetype,
      });

    if (uploadError) {
      throw new Error(`Gagal upload ke Supabase: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('bukti-pembayaran')
      .getPublicUrl(namaFile);
    
    const gambar_url = publicUrlData.publicUrl;

    const pembayaran = await prisma.pembayaran.findFirst({
        where: { order_id: numericOrderId },
        orderBy: { waktu_bayar: 'desc' }
    });

    if (!pembayaran) {
        return res.status(404).json({ message: "Catatan pembayaran tidak ditemukan" });
    }

    await prisma.pembayaran.update({
        where: { id: pembayaran.id },
        data: {
            bukti_pembayaran_url: gambar_url,
            status: 'MENUNGGU_KONFIRMASI'
        }
    });
    
    await prisma.orders.update({
        where: { id: numericOrderId },
        data: {
            status_pembayaran: 'MENUNGGU_KONFIRMASI'
        }
    });
    
    res.json({ message: "Upload bukti berhasil" });

  } catch (error) {
    console.error("Error uploading proof:", error);
    res.status(500).json({ message: "Gagal mengupload bukti" });
  }
}
