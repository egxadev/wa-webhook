# SilverStream Sehat WhatsApp Bot

Advanced webhook service for SilverStream Sehat WhatsApp bot built with TypeScript and Express.js. Handles Qontak webhook notifications with AI-powered responses using Google Gemini for health product information.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

Buat file `.env` di root directory project dan isi dengan:

```env
QONTAK_ACCESS_TOKEN=your_actual_access_token_here
QONTAK_BASE_URL=https://service-chat.qontak.com/api/open/v1
```

**Catatan**: Ganti `your_actual_access_token_here` dengan access token Qontak Anda yang sebenarnya.

3. Build the project (opsional untuk production):

```bash
npm run build
```

4. Start the service:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Usage

The webhook service runs on port 3000 by default.

- Webhook endpoint: `POST http://localhost:3000/webhook`
- Health check: `GET http://localhost:3000/health`
- Conversation info: `GET http://localhost:3000/conversation-info`
- Reset conversation: `POST /reset-conversation/:userId`

### Conversation Tree & AI Response Features

Service ini menggunakan **Conversation Tree** yang terstruktur untuk mengatur alur percakapan, dikombinasikan dengan **Google Gemini AI** untuk respons yang cerdas.

#### Flow Percakapan

1. **Greeting (Awal Chat)**: Bot memberikan interactive button message dengan 4 opsi utama
2. **Menu Selection**: User memilih opsi dari button
3. **Sub-menu Navigation**: Berdasarkan pilihan, bot menampilkan menu spesifik
4. **Information Display**: Bot memberikan informasi detail atau form pemesanan
5. **AI Response**: Untuk percakapan lanjutan, bot menggunakan AI untuk respons kontekstual

#### Opsi Menu Utama

- **🏝️ Destinasi Wisata**: Interactive list destinasi Indonesia
- **🛫 Bantuan Pemesanan**: Menu pemesanan tiket, hotel, paket wisata
- **ℹ️ Informasi Umum**: Info cuaca, transportasi, tips wisata
- **👥 Customer Service**: Kontak support langsung

#### Global Commands

User dapat menggunakan command berikut kapan saja:
- `menu` / `bantuan` / `help` - Kembali ke menu utama
- `kembali` - Kembali ke menu sebelumnya
- `reset` - Reset percakapan

Semua response dikirim melalui API Qontak ke room yang sama.

## Conversation Tree Structure

Service menggunakan file `conversation-tree.json` untuk mendefinisikan alur percakapan. Struktur terdiri dari:

- **States**: Kondisi percakapan saat ini dengan tipe message dan content
- **Transitions**: Aturan perpindahan antar states berdasarkan input user
- **Keywords**: Command global yang dapat digunakan kapan saja
- **Fallback Responses**: Respons default untuk input yang tidak dikenali

### WhatsApp API Limits Compliance

Bot telah dioptimasi sesuai batasan WhatsApp Business API:

- **Interactive Button Messages**: Maksimal **3 buttons** per message
- **Interactive List Messages**: Maksimal **10 list items** per message
- **Text Messages**: Tidak ada batasan panjang

### Menu Structure

```
🏠 Greeting (3 buttons)
├── 💊 Silverstream → List (5 items: Penjelasan, Cara Penggunaan, Konsultasi, Keluhan, Bisnis)
├── 🛡️ Stimel → List (3 items: Penjelasan, Cara Penggunaan, Terapi)
└── 📱 Akusehat → List (4 items: Penjelasan, Cara Download, Bisnis, Keluhan)

💬 Global Keywords: menu, help, cs, kembali, reset, produk, kesehatan
```

### Contoh State Structure

```json
{
  "greeting": {
    "type": "interactive_button",
    "message": {
      "body": "Selamat datang! Pilih layanan:",
      "buttons": [
        {"id": "destinasi", "title": "🏝️ Destinasi Wisata"},
        {"id": "pemesanan", "title": "🛫 Bantuan Pemesanan"},
        {"id": "informasi", "title": "ℹ️ Informasi Umum"}
      ]
    },
    "transitions": {
      "destinasi": "destinasi_menu",
      "pemesanan": "pemesanan_menu",
      "informasi": "informasi_menu"
    }
  }
}
```

## AI Conversation Memory

Bot menggunakan **Conversation Memory** untuk memberikan pengalaman percakapan yang lebih natural dan kontekstual:

### Fitur Memory

- **History Tracking**: Menyimpan 10 pesan terakhir per user
- **Context Awareness**: AI mengingat topik percakapan sebelumnya
- **Personalized Responses**: Respons disesuaikan dengan riwayat percakapan
- **State Continuity**: Bot mengingat state percakapan saat ini

### Contoh Percakapan Lanjutan

```
User: "Saya mau ke Bali"
Bot: [Informasi lengkap Bali + tawaran bantuan]

User: "Berapa harga hotelnya?"
Bot: [Menggunakan context Bali] "Untuk hotel di Bali, harga bervariasi..."

User: "Yang murah di area Seminyak"
Bot: [Melanjutkan konteks Bali & Seminyak] "Hotel budget di Seminyak..."
```

### AI Context Enhancement

Setiap state AI memiliki context spesifik:

```json
{
  "bali_ai_chat": {
    "type": "ai_generated",
    "message": {
      "context": "User sedang dalam percakapan lanjutan tentang Bali. Mereka sudah tahu informasi dasar. Berikan respons yang lebih detail dan personal."
    }
  }
}
```

Context AI menggabungkan:
1. **State Context**: Context spesifik dari state saat ini
2. **Conversation History**: 5 pesan terakhir
3. **Current State**: Status percakapan saat ini
4. **Instructions**: Panduan untuk respons yang baik

## Qontak Verification

To verify your webhook with Qontak, send a POST request to:

`https://service-chat.qontak.com/api/open/v1/message_interactions`

With the following payload:

```json
{
  "receive_message_from_agent": false,
  "receive_message_from_customer": true,
  "broadcast_log_status": false,
  "status_message": false,
  "url": "http://your-domain.com/webhook"
}
```

Replace `http://your-domain.com/webhook` with your actual webhook URL.

## Logging

All incoming webhook requests are logged to the console with:

- Timestamp
- Request headers
- Request body (JSON formatted)

This helps you inspect the data sent by Qontak.

## 🎯 Conversation Tree System

Service ini menggunakan sistem **Conversation Tree** yang terstruktur untuk mengelola alur percakapan bot.

### File Konfigurasi

- `conversation-tree.json` - Definisi alur percakapan lengkap
- `CONVERSATION-TREE-README.md` - Dokumentasi detail sistem

### Fitur Utama

#### 🤖 Intelligent Response Flow
Bot mengikuti alur percakapan yang telah ditentukan berdasarkan input user:

1. **Welcome State**: Interactive buttons untuk memilih produk
2. **Product Info**: Informasi detail produk yang dipilih
3. **Product Details**: Komposisi, khasiat, indikasi
4. **Usage Guide**: Cara pemakaian dan dosis
5. **Pricing**: Informasi harga dan paket
6. **Purchase Flow**: Proses pemesanan lengkap
7. **Consultation**: Layanan konsultasi
8. **Goodbye**: Penutup percakapan

#### 🔄 State Management
- Setiap user memiliki state percakapan tersendiri
- State tersimpan selama session aktif
- Mendukung reset percakapan kapan saja

#### 🏷️ Global Keywords
Bot mengenali keywords berikut dari state mana saja:
- `menu` - Kembali ke menu utama
- `kembali` - Kembali ke state sebelumnya
- `produk` - Lihat pilihan produk
- `konsultasi` - Layanan konsultasi
- `cs` - Hubungi customer service
- `selesai` - Akhiri percakapan

#### 🛡️ Fallback System
- Intelligent fallback untuk input yang tidak dikenali
- Partial matching untuk keywords
- Graceful degradation ke menu utama

### Contoh Alur Percakapan

```
User: "Halo"
Bot: [Interactive Buttons - Pilih Produk]

User: "Silverstream"
Bot: [Info Silverstream + Opsi selanjutnya]

User: "detail"
Bot: [Detail lengkap Silverstream]

User: "harga"
Bot: [Info harga dan paket]

User: "beli"
Bot: [Instruksi pemesanan]

User: "menu"
Bot: [Kembali ke menu utama]
```

### Customization

Conversation tree dapat dengan mudah dikustomisasi dengan mengedit file `conversation-tree.json`:

- **Menambah produk baru**: Tambahkan state baru dengan transitions
- **Mengubah respons**: Edit field `message` di state yang bersangkutan
- **Menambah keywords**: Tambahkan ke object `keywords`
- **Mengubah flow**: Update `transitions` di state yang ada