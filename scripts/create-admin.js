const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const [, , name, email, password] = process.argv;

  if (!name || !email || !password) {
    console.error('Pemakaian: node scripts/create-admin.js "Nama Admin" admin@email.com passwordnya');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Password minimal 6 karakter.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error(`User dengan email ${email} sudah ada (role: ${existing.role}). Tidak jadi membuat baru.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('Berhasil dibuat:');
  console.log({ id: user.id, name: user.name, email: user.email, role: user.role });
}

main()
  .catch((err) => {
    console.error('Gagal membuat admin:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
