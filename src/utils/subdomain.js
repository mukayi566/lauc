/**
 * Extracts the subdomain from the current window location.
 * 
 * Examples:
 * - student.fairviewuniversity.vercel.app -> student
 * - staff.lauc.local:5173 -> staff
 * - fairviewuniversity.vercel.app -> null
 */
export const getSubdomain = () => {
    const hostname = window.location.hostname;

    // Handle localhost/local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return null;
    }

    // Split by dot
    const parts = hostname.split('.');

    // Logic for standard domains (e.g., student.fairview.edu -> student)
    // If it's a vercel.app domain, it has 3 parts (fairviewuniversity.vercel.app)
    // Subdomain version would have 4 parts (student.fairviewuniversity.vercel.app)

    const isVercelSubdomain = hostname.endsWith('.vercel.app');

    if (isVercelSubdomain) {
        if (parts.length > 3) {
            return parts[0];
        }
    } else if (parts.length > 2) {
        // For generic custom domains (e.g., student.fairview.edu)
        return parts[0];
    }

    // Fallback: Check for ?portal= query parameter (useful for testing on default domain)
    const urlParams = new URLSearchParams(window.location.search);
    const portalParam = urlParams.get('portal');
    if (portalParam) return portalParam;

    return null;
};
