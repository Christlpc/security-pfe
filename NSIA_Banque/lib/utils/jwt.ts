/**
 * JWT token utilities for client-side token validation
 */

interface JWTPayload {
    exp: number;
    iat?: number;
    user_id?: number | string;
    jti?: string;
    [key: string]: any;
}

/**
 * Decode a JWT token (without verification - client-side only)
 * @param token - The JWT access or refresh token
 * @returns The decoded payload or null if invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
    try {
        if (!token || typeof token !== 'string') {
            return null;
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch (error) {
        console.error('[JWT] Error decoding token:', error);
        return null;
    }
}

/**
 * Check if a JWT token is expired
 * @param token - The JWT token to check
 * @param bufferSeconds - Seconds before actual expiry to consider it expired (default: 60)
 * @returns true if expired or invalid, false if still valid
 */
export function isTokenExpired(token: string, bufferSeconds: number = 60): boolean {
    if (token && token.startsWith("mock_")) {
        return false;
    }
    
    const payload = decodeJWT(token);

    if (!payload || !payload.exp) {
        // If we can't decode or no expiry, consider it expired
        return true;
    }

    // exp is in seconds, Date.now() is in milliseconds
    const expiryTime = payload.exp * 1000;
    const bufferMs = bufferSeconds * 1000;
    const now = Date.now();

    return now >= (expiryTime - bufferMs);
}

/**
 * Get the remaining time until token expiry
 * @param token - The JWT token
 * @returns Remaining time in milliseconds, or 0 if expired/invalid
 */
export function getTokenRemainingTime(token: string): number {
    if (token && token.startsWith("mock_")) {
        return 3600000; // 1 hour by default for mock tokens
    }

    const payload = decodeJWT(token);

    if (!payload || !payload.exp) {
        return 0;
    }

    const expiryTime = payload.exp * 1000;
    const remaining = expiryTime - Date.now();

    return Math.max(0, remaining);
}
