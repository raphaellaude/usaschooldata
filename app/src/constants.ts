export const DEFAULT_SCHOOL_YEAR = '2023-2024';

/**
 * API Configuration
 * Set VITE_API_BASE_URL in your .env file to configure the API endpoint.
 * Defaults to http://localhost:8080 for local development.
 *
 * Example .env:
 * VITE_API_BASE_URL=http://localhost:8080
 *
 * For production, this should be set to the deployed API URL.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
