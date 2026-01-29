/**
 * Error types for operator matching failures
 * Used when associating invoices with ClientKYC records
 */
export const OperatorMatchErrorTypes = {
    /** IBA ID was expected but not found in the incoming data */
    IBA_ID_NOT_FOUND: 'IBA_ID_NOT_FOUND',

    /** JetNet ID was expected but not found in the incoming data */
    JETNET_ID_NOT_FOUND: 'JETNET_ID_NOT_FOUND',

    /** Neither IBA nor JetNet ID available in the processed data */
    OPERATOR_ID_NOT_FOUND: 'OPERATOR_ID_NOT_FOUND',

    /** IDs were present but no matching ClientKYC record found */
    OPERATOR_ID_MISMATCH: 'OPERATOR_ID_MISMATCH',

    /** No ClientKYC match found via ID or name lookup */
    CLIENT_KYC_NOT_FOUND: 'CLIENT_KYC_NOT_FOUND',
} as const;

export type OperatorMatchErrorType = typeof OperatorMatchErrorTypes[keyof typeof OperatorMatchErrorTypes];

/**
 * Result of operator ID lookup
 */
export interface OperatorLookupResult {
    /** The matched operator ID from ClientKYC, or null if not found */
    operatorId: number | null;

    /** Method used to find the match: 'iba_id', 'jetnet_id', 'name_match', or 'none' */
    matchMethod: 'iba_id' | 'jetnet_id' | 'name_match' | 'none';

    /** Error type if no match was found */
    error?: OperatorMatchErrorType;

    /** The IBA ID that was attempted (for logging) */
    attemptedIbaId?: string;

    /** The JetNet ID that was attempted (for logging) */
    attemptedJetnetId?: string;
}
