export interface AircraftSummary {
    registration: string;
    mtow_kg: number;
    operatorName?: string;
    aircraftModelName?: string;
    model?: string; // Mapped from Python 'model'
    [key: string]: any;
}

export interface FeeDetails {
    fee?: number;
    fee_usd?: number;
    other_fees?: number | any[]; // Python returns [] when empty
    other_fees_usd?: number;
    currency?: string;
    fx_rate?: number;
    fx_rate_usd?: number; // Mapped from Python 'fx_rate_usd'
    calculation_description?: string;
    total_amount_usd?: number;
}

export interface ProcessingOutputEntry {
    flight_id: string | number | bigint;
    country: string;
    fir_label?: string;
    fir_name?: string;
    map_html?: string;
    flight_date?: string | Date;
    earliest_entry_time?: string | Date;
    latest_exit_time?: string | Date;
    takeoff_airport_icao?: string;
    landing_airport_icao?: string;
    takeoff_airport_iata?: string;
    landing_airport_iata?: string;
    act?: string;
    flight_data?: {
        cs?: string;
        act?: string;
        ms?: string;
        alic?: string;
        [key: string]: any;
    };
    fee_details?: FeeDetails;
    aircraft_data?: AircraftSummary;
    [key: string]: any;
}

export interface ProcessingError {
    flight_id: string | number | bigint;
    error_type?: string;
    error_type_detected?: string;
    error_message?: string;
    error_details?: string;
    country?: string;
    registration?: string;
    aircraft_data?: AircraftSummary;
    flight_data?: {
        alna?: string;
        cs?: string;
        aporgic?: string;
        aptkoic?: string;
        apdstic?: string;
        aplngic?: string;
        aporgia?: string;
        aptkoia?: string;
        apdstia?: string;
        aplngia?: string;
        acr?: string;
        acd?: string;
        act?: string;
        ms?: string;
        alic?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface ProcessFlightResult {
    success: boolean;
    output_entries: ProcessingOutputEntry[];
    master_file: string | null;
    error_message: string | null;
    error_traceback?: string;
    errors?: ProcessingError[];
    error_summary?: {
        total_errors: number;
        error_counts: Record<string, number>;
    };
}
