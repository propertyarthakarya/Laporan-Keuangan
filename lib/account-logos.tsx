import Image, { type StaticImageData } from 'next/image';
import { Landmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

// Logo bank asli dari asset proyek (img/Bank/*.png), di-import langsung supaya di-bundle
// Next.js — bekerja di mana pun file ini dipakai, tidak perlu lewat folder public/.
// Pakai path relatif (bukan alias "@/") karena lib/ dan img/ sama-sama ada di root
// project (sejajar) — kalau kamu pindahkan file account-logos.tsx ke folder lain,
// path relatif "../img/Bank/..." ini perlu disesuaikan jumlah "../"-nya.
import bcaLogo from '@/app/img/Bank/BCA.png';
import mandiriLogo from '@/app/img/Bank/Mandiri.png';
import briLogo from '@/app/img/Bank/BRI.png';
import bniLogo from '@/app/img/Bank/BNI.png';
import btnLogo from '@/app/img/Bank/BTN.png';
import cimbLogo from '@/app/img/Bank/CIMB.png';
import bankPapuaLogo from '@/app/img/Bank/BankPapua.png';

// Mapping nama akun → logo bank asli. Matching pakai "includes" case-insensitive, jadi
// nama akun seperti "BCA", "Bank BCA", atau "BCA Operasional" tetap kecocok ke logo BCA.
// Tambahin entry baru di sini kalau ada logo bank lain menyusul.
export const BANK_LOGOS: { keywords: string[]; src: StaticImageData; alt: string }[] = [
  { keywords: ['bca'], src: bcaLogo, alt: 'BCA' },
  { keywords: ['mandiri'], src: mandiriLogo, alt: 'Mandiri' },
  { keywords: ['bri'], src: briLogo, alt: 'BRI' },
  { keywords: ['bni'], src: bniLogo, alt: 'BNI' },
  { keywords: ['btn'], src: btnLogo, alt: 'BTN' },
  { keywords: ['cimb'], src: cimbLogo, alt: 'CIMB' },
  { keywords: ['papua'], src: bankPapuaLogo, alt: 'Bank Papua' },
];

export function getAccountLogo(accountName: string) {
  const name = accountName.toLowerCase();
  return BANK_LOGOS.find((bank) => bank.keywords.some((k) => name.includes(k))) ?? null;
}

// Fallback ikon monoline untuk akun yang belum punya logo terdaftar (mis. "Kas", atau
// bank baru yang logonya belum ditambahkan ke BANK_LOGOS).
export function getAccountIcon(accountName: string) {
  return accountName.toLowerCase().includes('kas') ? Wallet : Landmark;
}

/**
 * Avatar ikon akun: pakai logo bank asli kalau nama akun cocok dengan salah satu bank di
 * BANK_LOGOS, kalau tidak jatuh balik ke ikon monoline — jadi selalu tampil rapi walau ada
 * akun baru yang logonya belum ditambahkan.
 *
 * boxClassName/iconClassName mengatur ukuran (default disamakan dengan pola kartu dashboard),
 * iconBg/iconText cuma dipakai untuk mode fallback (ikon monoline), tidak berpengaruh
 * kalau logo asli ditemukan (logo selalu di kotak putih supaya kontras di kedua mode).
 */
export function AccountAvatar({
  accountName,
  boxClassName = 'h-8 w-8',
  iconClassName = 'h-4 w-4',
  iconBg = 'bg-blue-500/10 dark:bg-blue-400/10',
  iconText = 'text-blue-600 dark:text-blue-400',
}: {
  accountName: string;
  boxClassName?: string;
  iconClassName?: string;
  iconBg?: string;
  iconText?: string;
}) {
  const bank = getAccountLogo(accountName);

  if (bank) {
    return (
      <div
        className={cn(
          'flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5 ring-1 ring-black/5 dark:bg-white/95',
          boxClassName,
        )}
      >
        <Image src={bank.src} alt={bank.alt} className="h-full w-full object-contain" />
      </div>
    );
  }

  const Icon = getAccountIcon(accountName);
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-lg',
        iconBg,
        boxClassName,
      )}
    >
      <Icon className={cn(iconClassName, iconText)} />
    </div>
  );
}