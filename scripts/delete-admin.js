const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Pemakaian: node scripts/delete-admin.js email@domain.com');
    process.exit(1);
  }

  const deleted = await prisma.user.delete({ where: { email: email.toLowerCase() } });
  console.log('Berhasil dihapus:', { id: deleted.id, name: deleted.name, email: deleted.email });
}

main()
  .catch((err) => {
    console.error('Gagal menghapus:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());