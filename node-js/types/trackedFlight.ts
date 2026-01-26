/**
 * TrackedFlight Type Definition
 * Represents flight data structure from Apache Pinot
 */

export interface TrackedFlight {
    flightId: string | number | bigint;
    positions?: Array<{
        lat: number;
        lon: number;
        altitude?: number;
        timestamp?: string | number;
    }>;
    origin?: string;
    destination?: string;
    aircraft?: string;
    registration?: string;
    operator?: string;
    [key: string]: any; // Allow additional fields from Pinot
}
