import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export async function getKategori(req: Request, res: Response) {
  try {
    const kategori = await prisma.kategori.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(kategori);
  } catch (error) {
    console.error("Gagal mengambil kategori:", error); 
    res.status(500).json({ message: "Gagal mengambil data" });
  }
}

export async function createKategori(req: Request, res: Response) {
  try {
    const { nama_kategori } = req.body;
    const newKategori =  prisma.kategori.create({
      data: { nama_kategori },
    });
    res.status(201).json(newKategori);
  } catch (error) {
    console.error("Gagal membuat kategori:", error);
    res.status(500).json({ message: "Gagal membuat data" });
  }
}

export async function updateKategori(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    const { nama_kategori } = req.body;

    const updatedKategori =  prisma.kategori.update({
      where: { id: numericId },
      data: { nama_kategori },
    });

    res.json(updatedKategori);
  } catch (error) {
    console.error("Gagal mengupdate data:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengupdate data" });
  }
}

export async function deleteKategori(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);

    await prisma.kategori.delete({
      where: { id: numericId },
    });

    res.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus data:", error);
    res.status(400).json({ message: "Gagal menghapus: Kategori mungkin masih digunakan oleh produk." });
  }
}
