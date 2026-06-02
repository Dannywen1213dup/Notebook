import type { DiaryIpLocation } from '../types';

interface IpapiResponse {
  ipAddress?: string;
  cityName?: string;
  regionName?: string;
  countryName?: string;
  countryCode?: string;
  latitude?: number | string;
  longitude?: number | string;
  timeZones?: string[];
  asnOrganization?: string;
}

const LOCATION_ENDPOINTS = [
  'https://free.freeipapi.com/api/json',
  'https://freeipapi.com/api/json',
];

const toNumber = (value: number | string | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const fetchIpLocation = async (): Promise<DiaryIpLocation> => {
  const capturedAt = new Date().toISOString();

  try {
    let data: IpapiResponse | undefined;
    let lastError: Error | undefined;

    for (const endpoint of LOCATION_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`IP 定位接口返回 ${response.status}`);
        }
        data = (await response.json()) as IpapiResponse;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('IP 定位失败');
      }
    }

    if (!data) {
      throw lastError || new Error('IP 定位失败');
    }

    return {
      ip: data.ipAddress,
      city: data.cityName,
      region: data.regionName,
      country: data.countryName,
      countryCode: data.countryCode,
      latitude: toNumber(data.latitude),
      longitude: toNumber(data.longitude),
      timezone: data.timeZones?.[0],
      org: data.asnOrganization,
      source: 'freeipapi.com',
      capturedAt,
    };
  } catch (error) {
    return {
      source: 'freeipapi.com',
      capturedAt,
      lookupFailed: true,
      error: error instanceof Error ? error.message : 'IP 定位失败',
    };
  }
};
