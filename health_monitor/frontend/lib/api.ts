export interface SensorData {
    temperature_f: number;
    pulse_bpm: number;
    spo2_percent: number;
    air_quality_ppm: number;
    ecg_wave: number[];
    timestamp: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchLatestData(): Promise<SensorData> {
    const response = await fetch(`${API_BASE_URL}/latest-data`, {
        cache: 'no-store', // ensures Next.js fetches fresh data every time
    });

    if (!response.ok) {
        throw new Error('Failed to fetch sensor data');
    }

    return response.json();
}
