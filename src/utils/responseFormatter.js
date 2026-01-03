/**
 * Standard response formatter for API responses
 * ALWAYS includes all fields: status, message, error, data, token
 * @param {boolean} status - true for success, false for error
 * @param {string} message - Response message (always required)
 * @param {any} data - Response data (default: null)
 * @param {string|null} error - Technical error message for developers (default: null)
 * @param {Object|null} token - Token object (default: null)
 * @returns {Object} Formatted response object with ALL fields
 */
export const formatResponse = (status, message, data = null, error = null, token = null) => {
  return {
    status: status ? 1 : 0,
    message: message || '', // Always include message
    error: error, // Always include error (null if no error)
    data: data, // Always include data (null if no data)
    token: token // Always include token (null if no token)
  };
};

/**
 * Success response helper
 * For successful operations
 * @param {string} message - Success message (e.g., "Data fetched successfully")
 * @param {any} data - Response data (default: null)
 * @param {Object|null} token - Token object (default: null)
 * @returns {Object} Formatted success response
 */
export const successResponse = (message, data = null, token = null) => {
  return formatResponse(true, message, data, null, token);
};

/**
 * Success response with token
 * For authentication successes
 * @param {string} message - Success message (e.g., "Login successful")
 * @param {any} data - Response data (default: null)
 * @param {string} accessToken - Access token
 * @param {string} tokenType - Token type (default: 'Bearer')
 * @param {Object} additionalTokenProps - Additional token properties
 * @returns {Object} Formatted success response with token
 */
export const successResponseWithToken = (message, data = null, accessToken, tokenType = 'Bearer', additionalTokenProps = {}) => {
  const token = accessToken ? {
    accessToken,
    tokenType,
    ...additionalTokenProps
  } : null;

  return formatResponse(true, message, data, null, token);
};

/**
 * Error response helper
 * For failed operations
 * @param {string} message - User-friendly error message (e.g., "Failed to fetch data")
 * @param {string|null} error - Technical error for developers (default: null)
 * @param {any} data - Additional data (default: null)
 * @returns {Object} Formatted error response
 */
export const errorResponse = (message, error = null, data = null) => {
  return formatResponse(false, message, data, error, null);
};

export default {
  formatResponse,
  successResponse,
  successResponseWithToken,
  errorResponse
};