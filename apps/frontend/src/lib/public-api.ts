import axios from 'axios';

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'),
});

function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return promise.then((res) => res.data.data);
}

export const publicApi = {
  getVerseOfDay: () =>
    unwrap<{
      surah: number; ayah: number; arabicText: string;
      translationEn: string; reference: string;
    }>(api.get('/public/verse-of-day')),

  getPrayerTimes: (lat?: number, lng?: number, mosqueId?: string) =>
    unwrap<{
      fajr: string; sunrise: string; dhuhr: string;
      asr: string; maghrib: string; isha: string; date: string;
    }>(api.get('/prayer-times', { params: { lat, lng, mosqueId } })),

  getAnnouncements: (type?: string, limit?: number) =>
    unwrap<Array<{ id: string; title: string; content: string; priority: string; publishAt: string; expiresAt: string | null; type: string }>>(
      api.get('/public/announcements', { params: { type, limit } }),
    ),

  getMosques: (districtId?: string) =>
    unwrap<Array<{ id: string; name: string; address: string | null; gpsLat: number | null; gpsLng: number | null; districtId: string | null; imamName: string | null; imamPhoto: string | null }>>(
      api.get('/mosques', { params: { districtId, status: 'active' } }),
    ),

  getProvinces: () =>
    unwrap<Array<{ id: string; name: string; code: string }>>(api.get('/locations/provinces')),

  getDistricts: (provinceId?: string) =>
    unwrap<Array<{ id: string; name: string; code: string; provinceId: string }>>(
      api.get('/locations/districts', { params: { provinceId } }),
    ),

  getSectors: (districtId?: string) =>
    unwrap<Array<{ id: string; name: string; districtId: string }>>(
      api.get('/locations/sectors', { params: { districtId } }),
    ),

  getBlogPosts: (category?: string, page = 1) =>
    unwrap<{ data: Array<{ id: string; title: string; slug: string; excerpt: string | null; featuredImage: string | null; publishedAt: string }>; total: number }>(
      api.get('/public/blog/posts', { params: { category, page } }),
    ),

  getGallery: (category?: string, page = 1) =>
    unwrap<{
      data: Array<{
        id: string; title: string | null; description: string | null;
        fileKey: string; thumbnailKey: string | null; mediumKey: string | null;
        fileType: string; category: string | null; createdAt: string;
      }>;
      total: number; page: number; pages: number;
    }>(api.get('/public/gallery', { params: { category, page } })),
};
