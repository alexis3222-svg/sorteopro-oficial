declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
    }
}

export const FB_PIXEL_ID = "679718581870884";

export function pageview() {
    if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "PageView");
    }
}

export function trackViewContent(data?: Record<string, any>) {
    if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "ViewContent", data || {});
    }
}

export function trackAddToCart(data?: Record<string, any>) {
    if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "AddToCart", data || {});
    }
}

export function trackPurchase(data?: Record<string, any>) {
    if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Purchase", data || {});
    }
}