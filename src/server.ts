import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { protect, AuthenticatedRequest } from './middleware/auth';

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

import { getKategori, createKategori, updateKategori, deleteKategori } from './api/kategori';
import { getMenu, createMenu, getMenuById, updateMenu, deleteMenu } from './api/menu';
import { getMetodePembayaran, createMetodePembayaran, updateMetodePembayaran, deleteMetodePembayaran } from './api/metode-pembayaran';
import { getOrders, createOrder, getOrderById, updateOrderStatus, getOrdersByWa, getNewOrderCount, checkOrderStatus } from './api/orders';
import getStats from './api/dashboard/stats';
import getSalesChartData from './api/dashboard/sales-chart';
import konfirmasiPembayaran from './api/konfirmasi-pembayaran';
import { pakasirWebhook } from './api/webhook/pakasir';
import multer from 'multer';

// Placeholder for multer middleware
const upload = multer();

app.use(cors());
app.use(express.json());

// --- Routers ---
const authRouter = express.Router();
const adminRouter = express.Router();
const publicRouter = express.Router();

// --- Auth Routes ---
authRouter.post('/login', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '1d',
    });

    console.log('Generated token:', token);
    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- Admin Routes (Protected) ---
// Apply middleware to all admin routes
adminRouter.use(protect);

adminRouter.get('/dashboard', (req: AuthenticatedRequest, res) => {
  res.json({ message: 'Welcome to the dashboard!', user: req.user });
});
adminRouter.get('/dashboard/sales-chart', getSalesChartData);
adminRouter.get('/dashboard/stats', getStats);

// Menu Management (Admin)
adminRouter.post('/menu', upload.single('gambar'), createMenu);
adminRouter.put('/menu/:id', upload.single('gambar'), updateMenu);
adminRouter.delete('/menu/:id', deleteMenu);

// Category Management (Admin)
adminRouter.post('/kategori', createKategori);
adminRouter.put('/kategori/:id', updateKategori);
adminRouter.delete('/kategori/:id', deleteKategori);

// Payment Method Management (Admin)
adminRouter.post('/metode-pembayaran', createMetodePembayaran);
adminRouter.put('/metode-pembayaran/:id', upload.single('gambar_qris'), updateMetodePembayaran);
adminRouter.delete('/metode-pembayaran/:id', deleteMetodePembayaran);

// Order Management (Admin)
adminRouter.get('/orders', getOrders);
adminRouter.get('/orders/new-count', getNewOrderCount);
adminRouter.patch('/orders/:id', updateOrderStatus);

// --- Public Routes ---
// Menu (Public)
publicRouter.get('/menu', getMenu);
publicRouter.get('/menu/:id', getMenuById);

// Category (Public)
publicRouter.get('/kategori', getKategori);

// Payment Methods (Public)
publicRouter.get('/metode-pembayaran', getMetodePembayaran);

// Orders (Public)
publicRouter.post('/orders', createOrder);
publicRouter.get('/orders/by-wa/:nomorWa', getOrdersByWa);
publicRouter.get('/orders/:id', getOrderById); // TODO: Consider securing this further
publicRouter.post('/konfirmasi-pembayaran/:orderId', upload.single('bukti'), konfirmasiPembayaran);
publicRouter.post('/webhook/pakasir', pakasirWebhook);
publicRouter.get('/orders/:id/check-status', checkOrderStatus);


// --- Mount Routers ---
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/public', publicRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
