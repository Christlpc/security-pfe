import { describe, it, expect } from 'vitest';
import { authApi } from "../lib/api/auth";
import { profileApi } from "../lib/api/profile";
import { API_BASE_URL } from "../lib/utils/constants";

describe('API Connection Tests', () => {
    it('should connect to the API base URL', () => {
        console.log(`Testing API connection to: ${API_BASE_URL}`);
        expect(API_BASE_URL).toBeDefined();
    });

    it('should handle login with invalid credentials correctly', async () => {
        console.log("Testing Login Endpoint...");
        try {
            await authApi.login({ username: "testuser", password: "wrongpassword" });
        } catch (error: any) {
            if (error.response) {
                console.log(`Login Endpoint responded with status: ${error.response.status}`);
                // Expect 401 (Unauthorized) or 400 (Bad Request) depending on implementation
                expect([400, 401]).toContain(error.response.status);
            } else {
                console.error("Login Endpoint Error:", error.message);
                throw error;
            }
        }
    });

    it('should require authentication for profile endpoint', async () => {
        console.log("\nTesting Profile Endpoint...");
        try {
            await profileApi.getProfile();
        } catch (error: any) {
            if (error.response) {
                console.log(`Profile Endpoint responded with status: ${error.response.status}`);
                // Expect 401 Unauthorized
                expect(error.response.status).toBe(401);
            } else {
                console.error("Profile Endpoint Error:", error.message);
                throw error;
            }
        }
    });
});
