# Ayam Geprek Mamank - Backend API

REST API untuk sistem pemesanan Ayam Geprek Mamank, dibangun menggunakan **Express.js**, **Prisma ORM**, dan **PostgreSQL**.

## 🚀 Fitur Utama

*   **Manajemen Pesanan:** Create, Read, Update status pesanan.
*   **Integrasi Pakasir:** Generate payment URL dan Webhook untuk konfirmasi pembayaran otomatis.
*   **Manajemen Menu & Kategori:** CRUD untuk item menu dan kategorinya.
*   **Autentikasi Admin:** Login aman menggunakan JWT (JSON Web Token).
*   **Laporan Penjualan:** Endpoint statistik untuk dashboard admin.

## 🛠️ Teknologi

*   [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Prisma ORM](https://www.prisma.io/)
*   [PostgreSQL](https://www.postgresql.org/) (via Supabase)
*   [JWT](https://jwt.io/) (Authentication)

## 📦 Instalasi & Menjalankan

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Konfigurasi Environment:**
    Buat file `.env` di root folder backend:
    ```env
    # Database
    DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

    # Pakasir Payment Gateway
    PAKASIR_PROJECT_SLUG="[SLUG_PROJECT]"
    PAKASIR_API_KEY="[API_KEY]"

    # Security
    JWT_SECRET="rahasia_negara_12345"

    # Server
    PORT=3001
    ```

3.  **Setup Database:**
    Push schema Prisma ke database:
    ```bash
    npx prisma db push
    ```

4.  **Jalankan Server:**
    ```bash
    npm run dev
    ```
    Server berjalan di `http://localhost:3001`.

## 🔌 API Endpoints

### Public
*   `GET /api/public/menu` - Ambil daftar menu
*   `POST /api/public/orders` - Buat pesanan baru (return Payment URL)
*   `GET /api/public/orders/:id` - Detail pesanan
*   `GET /api/public/orders/:id/check-status` - Cek status pembayaran ke Pakasir manual
*   `POST /api/public/webhook/pakasir` - Webhook notifikasi pembayaran

### Admin (Butuh Header `Authorization: Bearer <token>`)
*   `POST /api/auth/login` - Login admin (dapat token)
*   `GET /api/admin/orders` - Lihat semua pesanan
*   `PATCH /api/admin/orders/:id` - Update status pesanan
*   `POST /api/admin/menu` - Tambah menu baru
*   `GET /api/admin/dashboard/stats` - Statistik penjualan

## 💳 Integrasi Pakasir

Sistem ini menggunakan **Pakasir** untuk pembayaran online.
*   **Checkout:** Backend men-generate URL pembayaran unik untuk setiap order.
*   **Webhook:** Endpoint `/api/public/webhook/pakasir` menerima notifikasi `POST` dari Pakasir saat pembayaran sukses.
*   **Manual Check:** Endpoint `/check-status` memanggil API Pakasir `transactiondetail` untuk verifikasi manual jika webhook gagal (misal di localhost).
