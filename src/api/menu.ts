import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';

const prisma = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_KEY as string);

export async function createMenu(req: Request,  res: Response) {
  try {
    const { nama_produk,  deskripsi, harga, kategori_id } = req.body;
    const gambar = req.file;

    if (!gambar) {
      return res.status(400).json({ message: "Tidak ada gambar yang diupload" });
    }

    const namaFile = Date.now() + "_" + gambar.originalname;
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(namaFile, gambar.buffer, {
        contentType: gambar.mimetype,
      });

    if (uploadError) {
      throw new Error(`Gagal upload ke Supabase: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(namaFile);
    
    const gambar_url = publicUrlData.publicUrl;

    const newProduk = await prisma.produk.create({
      data: {
        nama_produk,
        deskripsi,
        harga: Number(harga),
        kategori_id: Number(kategori_id),
        gambar_url: gambar_url,
      },
    });
    
    res.status(201).json(newProduk);
  } catch (error) {
    console.error("Error creating produk:", error);
    res.status(500).json({ message: "Error creating produk" });
  }
}

export async function getMenu(req: Request, res: Response) {
  try {
    const produk = await prisma.produk.findMany({
      include: {
        kategori: true,
      },
    });
    res.status(200).json(produk);
  }  catch (error) {
    console.error("Gagal mengambil Produk:", error);
    res.status(500).json({ message: "Error fetching produk" });
  }
}

export async function getMenuById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    const produk = await prisma.produk.findUnique({
      where: { id: numericId },
    });

    if (!produk) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    res.status(200).json(produk);
  } catch (error) {
    console.error("Error fetching produk:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil data" });
  }
}

export async function updateMenu(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    const { nama_produk, deskripsi, harga, kategori_id } = req.body;
    const gambar = req.file;

    let gambar_url: string | undefined = undefined;

    if (gambar) {
      const namaFile = `produk_${numericId}_${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(namaFile, gambar.buffer, {
          contentType: gambar.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Gagal upload ke Supabase: ${uploadError.message}`);
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(namaFile);
      
      gambar_url = publicUrlData.publicUrl;
    }

    const dataToUpdate: any = {
        nama_produk,
        deskripsi,
        harga: Number(harga),
        kategori_id: Number(kategori_id),
    };

    if (gambar_url) {
        dataToUpdate.gambar_url = gambar_url;
    }

    const updatedProduk = await prisma.produk.update({
      where: { id: numericId },
      data: dataToUpdate,
    });

    res.status(200).json(updatedProduk);

  } catch (error) {
    console.error("Error updating produk:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengupdate data" });
  }
}

export async function deleteMenu(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    await prisma.produk.delete({
      where: { id: numericId },
    });
    res.json({ message: "Produk berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting produk:", error);
    res.status( 500).json({ message: "Terjadi kesalahan saat menghapus data" });
  }
}
