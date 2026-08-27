"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
/**
 * Mengosongkan SEMUA data di database (bukan menghapus tabel/schema-nya,
 * hanya isinya). Urutan penghapusan penting karena ada foreign key:
 * Transaction & LoginActivity harus dihapus dulu sebelum User & Category,
 * karena keduanya punya relasi ke User (dan Transaction juga ke Category).
 *
 * PERINGATAN: ini menghapus SEMUA baris di tabel-tabel ini secara permanen.
 * Jangan jalankan di database produksi yang sudah ada data asli.
 *
 * Cara pakai:
 *   npx ts-node-dev --transpile-only src/clear-data.ts
 * atau kalau sudah ditambahkan ke package.json:
 *   npm run clear:data
 */
async function main() {
    console.log('Menghapus semua data...');
    const deletedTransactions = await prisma_1.default.transaction.deleteMany({});
    console.log(`- Transaction: ${deletedTransactions.count} baris dihapus`);
    const deletedLoginActivities = await prisma_1.default.loginActivity.deleteMany({});
    console.log(`- LoginActivity: ${deletedLoginActivities.count} baris dihapus`);
    const deletedUsers = await prisma_1.default.user.deleteMany({});
    console.log(`- User: ${deletedUsers.count} baris dihapus`);
    const deletedCategories = await prisma_1.default.category.deleteMany({});
    console.log(`- Category: ${deletedCategories.count} baris dihapus`);
    console.log('Selesai. Database sekarang kosong (struktur tabel tetap utuh).');
}
main()
    .catch((err) => {
    console.error('Gagal membersihkan data:', err);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
