import { Request } from 'express';
import prisma from './prisma';

type LoginStatus = 'SUCCESS' | 'FAILED';

/**
 * Mengambil IP address "asli" client, dengan mempertimbangkan reverse proxy
 * (mis. nginx / load balancer) yang mengirim header X-Forwarded-For.
 *
 * CATATAN: kalau app di-deploy di belakang proxy, pastikan
 * `app.set('trust proxy', 1)` sudah diset di server/src/index.ts (atau
 * setara), supaya req.ip juga akurat sebagai fallback.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Parser User-Agent yang sangat ringan (tanpa dependency tambahan).
 * Cukup untuk keperluan tampilan "Chrome di Windows", bukan untuk
 * fingerprinting presisi. Kalau butuh lebih akurat, ganti dengan
 * library `ua-parser-js`.
 */
function parseUserAgent(ua: string | undefined): { browser: string | null; os: string | null } {
  if (!ua) return { browser: null, os: null };

  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  let os: string | null = null;
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { browser, os };
}

/**
 * Cek apakah sebuah IP termasuk IP privat/lokal (loopback, LAN, dsb).
 * IP semacam ini tidak bisa di-lookup ke lokasi geografis asli, jadi
 * kita skip pemanggilan API eksternal untuk kasus ini.
 */
function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('::ffff:127.')) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  return false;
}

interface GeoLocation {
  city: string | null;
  country: string | null;
}

/**
 * Lookup kota & negara dari IP address menggunakan ip-api.com (gratis,
 * tanpa API key, batas 45 request/menit — cukup untuk trafik login
 * internal). Kalau IP-nya privat/lokal (termasuk saat development di
 * localhost), atau kalau lookup gagal/timeout, kembalikan null saja
 * tanpa melempar error — pencatatan login tidak boleh gagal gara-gara
 * fitur ini.
 */
async function getGeoLocation(ip: string): Promise<GeoLocation> {
  if (isPrivateOrLocalIp(ip)) {
    return { city: null, country: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return { city: null, country: null };

    const data = (await res.json()) as { status: string; country?: string; city?: string };
    if (data.status !== 'success') return { city: null, country: null };

    return { city: data.city ?? null, country: data.country ?? null };
  } catch (err) {
    console.error('[loginActivity] Gagal lookup lokasi IP:', err);
    return { city: null, country: null };
  }
}

interface RecordLoginActivityParams {
  req: Request;
  emailAttempted: string;
  status: LoginStatus;
  userId?: string | null;
}

/**
 * Mencatat satu percobaan login (sukses atau gagal) beserta deteksi
 * anomali sederhananya. Dipanggil "fire-and-forget" dari route /auth/login
 * (lihat auth.ts) supaya tidak menambah latency ke response login —
 * semua error di sini ditelan (di-log ke console) dan TIDAK PERNAH
 * dilempar keluar, supaya proses login utama tidak pernah gagal gara-gara
 * logging ini bermasalah.
 */
export async function recordLoginActivity({
  req,
  emailAttempted,
  status,
  userId = null,
}: RecordLoginActivityParams): Promise<void> {
  try {
    const email = emailAttempted.toLowerCase();
    const ipAddress = getClientIp(req);
    const userAgentRaw = req.headers['user-agent'] || null;
    const { browser, os } = parseUserAgent(userAgentRaw ?? undefined);
    const { city, country } = await getGeoLocation(ipAddress);

    let isNewDevice = false;
    let isNewLocation = false;
    let failedAttemptsBeforeSuccess = 0;

    if (status === 'SUCCESS' && userId) {
      // Bandingkan dengan riwayat login SUKSES user ini sebelumnya.
      const priorSuccesses = await prisma.loginActivity.findMany({
        where: { userId, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { userAgent: true, ipAddress: true },
      });

      // Kalau ini login sukses pertama user tsb, jangan tandai apa-apa
      // sebagai anomali — belum ada baseline untuk dibandingkan.
      if (priorSuccesses.length > 0) {
        isNewDevice = !priorSuccesses.some((p) => p.userAgent === userAgentRaw);
        isNewLocation = !priorSuccesses.some((p) => p.ipAddress === ipAddress);
      }

      // Hitung berapa kali gagal berturut-turut (email yang sama) sejak
      // login sukses terakhir untuk email ini.
      const lastSuccess = await prisma.loginActivity.findFirst({
        where: { emailAttempted: email, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      });

      failedAttemptsBeforeSuccess = await prisma.loginActivity.count({
        where: {
          emailAttempted: email,
          status: 'FAILED',
          createdAt: { gt: lastSuccess?.createdAt ?? new Date(0) },
        },
      });
    }

    await prisma.loginActivity.create({
      data: {
        emailAttempted: email,
        userId,
        status,
        ipAddress,
        userAgent: userAgentRaw,
        browser,
        os,
        city,
        country,
        isNewDevice,
        isNewLocation,
        failedAttemptsBeforeSuccess,
      },
    });
  } catch (err) {
    // Sengaja tidak di-rethrow — logging aktivitas login tidak boleh
    // pernah menyebabkan proses login gagal.
    console.error('[loginActivity] Gagal mencatat aktivitas login:', err);
  }
}