const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const https = require('https');

// Konfigurasi Bot - Gunakan environment variable untuk keamanan
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7820542562:AAERQcDvMn4jvncVIm9-Vz8zeMTXiNCySXc';
const bot = new TelegramBot(TOKEN, {polling: true});

// URL Target WhatsApp
const WHATSAPP_URL = 'https://www.whatsapp.com/contact/';

// Data Default
const DEFAULT_EMAIL = 'kakov43163@tieal.com';
const DEFAULT_MESSAGE = (phone) => `Tim Dukungan WhatsApp, Saya Mendapat Keluhan Terkait Akun WhatsApp Saya, Akun WhatsApp Saya Terblokir Dan Saya Tidak Dapat Mengakses Akun Saya, Jika Saya Melakukan Kesalahan, Saya Meminta Maaf Atas Kesalahan Saya, Saya Telah Melakukan Reset Tapi Akun WhatsApp Saya Belum Juga Bisa Di Akses, Saya Sangat Menghormati Atas Pelanggaran Yang Di Beri, Dan Saya Sekarang Mengerti Bahwa Pentingnya Mematuhi Ketentuan Layanan WhatsApp, Karena Jika Tidak Mematuhi Ketentuan Layanan WhatsApp Maka Akan Berpengaruh Pada Akun WhatsApp Yang Saya Gunakan, Saya Dengan Hormat Meminta Kesempatan Untuk Memperbaiki Kesalahan Saya Dan Saya Akan Mematuhi Ketentuan Layanan WhatsApp Pada Masa Yang Mendatang, Saya Mohon Untuk Memulihkan Akun WhatsApp Saya Kembali Agar Dapat Di Akses Kembali, Akun WhatsApp Saya  ${phone}`;

// Koleksi Headers dari berbagai browser dan device
const BROWSER_HEADERS = [
    // Firefox Windows
    {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
    },
    // Chrome Windows
    {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    },
    // Safari Mac
    {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-us',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }
];

// HTTPS Agent dengan konfigurasi khusus (tetap aman)
const httpsAgent = new https.Agent({
    keepAlive: true,
    timeout: 10000
});

// Fungsi untuk membersihkan dan memformat nomor telepon
function cleanPhoneNumber(phone) {
    // Hapus semua karakter non-digit termasuk + dan spasi
    let cleaned = phone.replace(/[^0-9]/g, '');
    
    // Jika nomor diawali dengan 0, ganti dengan kode negara 62 (Indonesia)
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    
    // Pastikan panjang nomor antara 10-15 digit
    if (cleaned.length >= 10 && cleaned.length <= 15) {
        return cleaned;
    } else {
        return null;
    }
}

// Fungsi untuk mendapatkan headers acak
function getRandomHeaders() {
    const headers = Object.assign({}, BROWSER_HEADERS[Math.floor(Math.random() * BROWSER_HEADERS.length)]);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Origin'] = 'https://www.whatsapp.com';
    headers['Referer'] = 'https://www.whatsapp.com/contact/';
    return headers;
}

// Fungsi untuk delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fungsi untuk Mengirim Laporan dengan retry
async function sendReport(phone, chatId, retries = 3) {
    const payload = new URLSearchParams({
        'email': DEFAULT_EMAIL,
        'phone': phone,
        'problem': 'account_access',
        'message': DEFAULT_MESSAGE(phone),
        'submit': 'Send'
    }).toString();

    let successCount = 0;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await bot.sendMessage(chatId, `📤 Mencoba mengirim (Percobaan ${attempt}/${retries})...`);
            
            try {
                const response = await axios.post(WHATSAPP_URL, payload, {
                    timeout: 10000,
                    headers: getRandomHeaders(),
                    httpsAgent: httpsAgent,
                    maxRedirects: 5
                });
                
                if (response.status >= 200 && response.status < 300) {
                    successCount++;
                    console.log(`Berhasil mengirim laporan`);
                    await bot.sendMessage(chatId, `✅ Laporan untuk nomor ${phone} berhasil dikirim!`);
                    return true;
                } else {
                    console.error(`Gagal mengirim: Status ${response.status}`);
                }
            } catch (error) {
                console.error(`Gagal mengirim:`, error.message);
                // Jika ini adalah attempt terakhir, lempar error
                if (attempt === retries) {
                    throw error;
                }
            }
            
            await delay(2000); // Delay antara setiap request
            
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            if (attempt < retries) {
                await delay(3000 * attempt); // Exponential backoff
            } else {
                await bot.sendMessage(chatId, `❌ Gagal mengirim laporan untuk nomor ${phone} setelah ${retries} percobaan. Error: ${error.message}`);
                return false;
            }
        }
    }
}

// Handler untuk perintah /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Halo! Jarvis Kirim nomor WhatsApp yang ingin dilaporkan.\nContoh: +62 812-3456-7890 atau 081234567890');
});

// Handler untuk pesan teks
bot.on('message', async (msg) => {
    // Skip jika pesan dari bot sendiri
    if (msg.from.is_bot) return;
    
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Skip jika pesan adalah command
    if (text.startsWith('/')) return;

    // Bersihkan dan validasi nomor telepon
    const cleanedNumber = cleanPhoneNumber(text);
    
    if (cleanedNumber) {
        await bot.sendMessage(chatId, `⏳ Memproses nomor ${cleanedNumber}...`);
        await sendReport(cleanedNumber, chatId);
    } else {
        await bot.sendMessage(chatId, '❌ Format nomor tidak valid. Harap masukkan nomor yang benar.\nContoh: +62 812-3456-7890 atau 081234567890');
    }
});

// Handler error global
bot.on('error', (error) => {
    console.error('Global Bot Error:', error);
});

// Handler untuk error yang tidak tertangkap
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

console.log('🤖 Bot sedang berjalan...');
