# Conversation Tree Documentation

## 📋 Overview

Conversation Tree adalah sistem alur percakapan terstruktur untuk bot Silverstream Sehat yang mendefinisikan semua kemungkinan interaksi antara user dan bot.

## 🏗️ Struktur Conversation Tree

### File: `conversation-tree.json`

```json
{
  "version": "1.0",
  "description": "Conversation tree untuk bot Silverstream Sehat",
  "initial_state": "welcome",
  "states": { ... },
  "keywords": { ... },
  "fallback_responses": { ... }
}
```

### Komponen Utama

1. **States**: Setiap state mewakili satu langkah dalam percakapan
2. **Transitions**: Peta transisi dari satu state ke state lain
3. **Keywords**: Kata kunci global yang dapat dipanggil dari state mana saja
4. **Fallback Responses**: Respons default untuk input yang tidak dikenali

## 🎯 State Types

### 1. Text State
```json
{
  "type": "text",
  "message": "Pesan yang akan dikirim ke user",
  "transitions": {
    "keyword1": "next_state_1",
    "keyword2": "next_state_2"
  },
  "fallback": "fallback_state"
}
```

### 2. Interactive Button State
```json
{
  "type": "interactive_button",
  "message": {
    "body": "Pesan utama",
    "buttons": [
      {
        "id": "button_id",
        "title": "Button Text"
      }
    ]
  },
  "transitions": {
    "button_id": "next_state"
  }
}
```

## 🔄 Flow Percakapan

### Alur Utama:

```
👋 User memulai chat
    ↓
🎯 welcome (Interactive Buttons: Silverstream, Stimel, Akusehat)
    ↓
📦 [Produk dipilih] → product_info
    ↓
🔍 Detail/Cara Pakai/Harga → product_detail / product_usage / product_price
    ↓
🛒 Pembelian → product_purchase → order_confirmation
    ↓
✅ Selesai → goodbye
```

### State Transitions

#### Welcome State
- **Input**: User memulai percakapan
- **Output**: Interactive buttons untuk memilih produk
- **Transitions**:
  - `silverstream` → `silverstream_info`
  - `stimel` → `stimel_info`
  - `akusehat` → `akusehat_info`

#### Product Info States
Setiap produk memiliki state info yang menjelaskan:
- Manfaat utama
- Kegunaan produk
- Opsi selanjutnya (detail, cara pakai, harga, beli)

#### Product Detail States
Informasi lengkap produk:
- Komposisi
- Khasiat
- Indikasi
- Kontraindikasi

#### Product Usage States
Panduan penggunaan:
- Dosis
- Cara pakai
- Panduan penyimpanan

#### Product Price States
Informasi harga dan paket:
- Harga satuan
- Paket hemat
- Bonus dan promo

#### Purchase States
Proses pemesanan:
- Instruksi transfer
- Informasi pengiriman
- Kontak customer service

## 🏷️ Keywords Global

Bot mengenali keywords berikut dari state mana saja:

```json
{
  "menu": "welcome",
  "kembali": "welcome",
  "home": "welcome",
  "produk": "welcome",
  "beli": "welcome",
  "harga": "welcome",
  "konsultasi": "consultation",
  "cs": "contact_cs",
  "selesai": "goodbye"
}
```

## 🔧 Technical Implementation

### ConversationService Class

```typescript
class ConversationService {
  // Load conversation tree dari JSON
  loadConversationTree(): ConversationTree

  // Dapatkan state awal
  getInitialState(): ConversationState

  // Dapatkan state user saat ini
  getUserState(userId: string): ConversationState

  // Process input user dan return next state
  processUserInput(userId: string, input: string): ConversationState

  // Reset conversation user
  resetUserState(userId: string): void

  // Check apakah conversation berakhir
  shouldEndConversation(userId: string): boolean
}
```

### Integration dengan Webhook

```typescript
// Dalam webhook handler
const userId = webhookData.room_id;
const conversationState = conversationService.processUserInput(userId, customerText);

// Convert ke format pesan yang sesuai
if (conversationState.type === 'text') {
  // Kirim text message
} else if (conversationState.type === 'interactive_button') {
  // Kirim button message
}
```

## 📊 State Management

- **User State Storage**: Menggunakan Map untuk menyimpan state setiap user
- **State Key**: Menggunakan `room_id` sebagai identifier unik user
- **State Persistence**: State tersimpan selama session aktif

## 🔄 Fallback System

### Level 1: State Fallback
Setiap state dapat memiliki fallback state sendiri

### Level 2: Keyword Matching
Bot mencoba mencocokkan input dengan keywords global

### Level 3: Partial Matching
Bot mencari kecocokan partial dalam transitions

### Level 4: Global Fallback
Jika tidak ada yang cocok, kembali ke unknown input response

## 📈 Monitoring & Analytics

### Endpoint Info
```
GET /conversation-info
```
Mengembalikan informasi conversation tree:
- Version
- Description
- Total states

### Reset Conversation
```
POST /reset-conversation/:userId
```
Reset state percakapan user ke awal

## 🎨 Customization

### Menambah State Baru
1. Tambahkan state ke `states` object
2. Definisikan `type`, `message`, `transitions`
3. Update state yang mereferensi state baru

### Menambah Keywords
Tambahkan ke `keywords` object dengan format:
```json
"keyword": "target_state"
```

### Mengubah Respons
Edit `message` field dalam state yang bersangkutan

## 🐛 Error Handling

- **File Load Error**: Throw error jika `conversation-tree.json` tidak ditemukan
- **Invalid State**: Fallback ke initial state jika state tidak ditemukan
- **Network Error**: Logging error tapi tidak crash aplikasi

## 📝 Best Practices

1. **Consistent Naming**: Gunakan snake_case untuk state names
2. **Clear Transitions**: Pastikan setiap state memiliki transition yang jelas
3. **Fallback Coverage**: Setiap state harus memiliki fallback
4. **User-Friendly Messages**: Gunakan bahasa yang natural dan helpful
5. **Progressive Disclosure**: Berikan informasi sedikit demi sedikit

## 🔍 Testing

### Manual Testing Flow:
1. Start conversation → Should show product selection
2. Choose product → Should show product info
3. Ask for details → Should show detailed info
4. Ask for price → Should show pricing
5. Try to buy → Should show purchase instructions
6. Say "menu" → Should go back to start
7. Say "selesai" → Should end conversation

### Automated Testing:
- Unit tests untuk ConversationService
- Integration tests untuk webhook flow
- E2E tests dengan mock Qontak API
