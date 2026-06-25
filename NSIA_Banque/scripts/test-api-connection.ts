import { apiClient } from "../lib/api/client";
import { authApi } from "../lib/api/auth";
import { profileApi } from "../lib/api/profile";
import { API_BASE_URL } from "../lib/utils/constants";

async function testApiConnection() {
    console.log(`Testing API connection to: ${API_BASE_URL}`);

    try {
        // 1. Test Login (You might need valid credentials here, or mock it if just testing structure)
        // For now, we'll just check if the endpoint is reachable or returns 401/400 as expected without credentials
        console.log("Testing Login Endpoint...");
        try {
            await authApi.login({ username: "testuser", password: "wrongpassword" });
        } catch (error: any) {
            if (error.response) {
                console.log(`Login Endpoint responded with status: ${error.response.status}`);
                if (error.response.status === 401) {
                    console.log("Login endpoint is active and rejected invalid credentials (Expected).");
                } else if (error.response.status === 400) {
                    console.log("Login endpoint is active and validated input (Expected).");
                }
                else {
                    console.log("Login endpoint response:", error.response.data);
                }
            } else {
                console.error("Login Endpoint Error:", error.message);
            }
        }

        // 2. Test Profile Endpoint (requires auth, so we expect 401 if not logged in)
        console.log("\nTesting Profile Endpoint...");
        try {
            await profileApi.getProfile();
        } catch (error: any) {
            if (error.response) {
                console.log(`Profile Endpoint responded with status: ${error.response.status}`);
                if (error.response.status === 401) {
                    console.log("Profile endpoint is protected and requires auth (Expected).");
                } else if (error.response.status === 404) {
                    console.error("Profile endpoint NOT FOUND (Failed).");
                }
            } else {
                console.error("Profile Endpoint Error:", error.message);
            }
        }

    } catch (error: any) {
        console.error("Unexpected Error:", error);
    }
}

testApiConnection();
