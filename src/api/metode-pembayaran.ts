import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';

const prisma = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_KEY as string);

export async function getMetodePembayaran(req: Request, res: Response) {
  try {
    const methods = await prisma.metodepembayaran.findMany();
    res.set({
      "Cache-Control": "public, max-age=360, stale-while-revalidate=3600"
    });
    res.status(200).json(methods);
  } catch (error) {
    console.error("Gagal mengambil metode pembayaran:", error);
    res.status(500).json({ message: "Gagal mengambil data" });
  }
}

export async function createMetodePembayaran(req: Request, res: Response) {
  try {
    const { nama_metode, is_active } = req.body;
    const newMethod = await prisma.  metodepembayaran.create({
      data: {
        nama_metode,
        is_active: Boolean(is_active),
      },
    });
    res.status(201).json(newMethod);
  } catch (error) {
    console.error("Gagal membuat membuat metode pembayaran:", error);
    res.status(500).json({ message: "0" });
  }
}

export async function updateMetodePembayaran(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    const { nama_metode, nomor_rekening, nama_rekening } = req.body;
    const gambar_qris = req.file;
    
    let gambar_qris_url: string | undefined = undefined;

    if (gambar_qris) {
      const namaFile = `qris_${numericId}_${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('qris-images')
        .upload(namaFile, gambar_qris.buffer, {
          contentType: gambar_qris.mimetype,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Gagal upload QRIS ke Supabase: ${uploadError.message}`);
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('qris-images')
        .getPublicUrl(namaFile);
      
      gambar_qris_url = publicUrlData.publicUrl;
    }

    const dataToUpdate: any = {
      nama_metode,
      nomor_rekening,
      nama_rekening,
    };

    if (gambar_qris_url) {
      dataToUpdate.gambar_qris_url = gambar_qris_url;
    }

    const updatedMethod = await prisma.metodepembayaran.update({
      where: { id: numericId },
      data: dataToUpdate,
    });
    
    res.json(updatedMethod);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengupdate data" });
  }
}

export async function deleteMetodePembayaran(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    await prisma.metodepembayaran.delete({ where: { id: numericId } });
    res.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    console.error("Gagal megnhapus :", error);
    res.status(500).json({ message: "Gagal menghapus data" });
  }
}
