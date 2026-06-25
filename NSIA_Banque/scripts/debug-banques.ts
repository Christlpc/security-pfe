import { apiClient } from "../lib/api/client";
import { authApi } from "../lib/api/auth";
import { API_BASE_URL } from "../lib/utils/constants";

// Désactiver le mock pour ce script
process.env.NEXT_PUBLIC_USE_MOCK = "false";

async function debugBanques() {
    console.log(`Debugging Banques API on: ${API_BASE_URL}`);

    try {
        // 1. Authenticate
        console.log("Authenticating as superadmin...");
        try {
            const authResponse = await authApi.login({ username: "super_admin", password: "Admin123!" });
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${authResponse.access}`;
            console.log("Authentication successful.");
        } catch (error: any) {
            console.error("Authentication failed:", error?.message || error);
            return;
        }

        // 2. Fetch Banques
        console.log("\nFetching Banques...");
        try {
            const response = await apiClient.get("/api/v1/banques/");
            console.log(`Response Status: ${response.status}`);

            const data = response.data;
            if (data.results && data.results.length > 0) {
                console.log(`Found ${data.count} banques.`);

                // Log basic list info
                data.results.forEach((banque: any) => {
                    console.log(`- ${banque.nom_complet} (${banque.id})`);
                });

                // Fetch details for the first bank
                const firstBanque = data.results[0];
                console.log(`\nFetching Details for Bank ID: ${firstBanque.id}...`);

                try {
                    const detailResponse = await apiClient.get(`/api/v1/banques/${firstBanque.id}/`);
                    console.log("Detail Response Keys:", Object.keys(detailResponse.data));

                    // Check for products in various possible keys
                    console.log("Detail 'produits_disponibles':", detailResponse.data.produits_disponibles);
                    console.log("Detail 'produits':", detailResponse.data.produits);
                    console.log("Detail 'products':", detailResponse.data.products);

                    console.log(`\nFetching Products Endpoint for Bank ID: ${firstBanque.id}...`);
                    const productsResponse = await apiClient.get(`/api/v1/banques/${firstBanque.id}/produits/`);
                    console.log("Products Endpoint Data:", productsResponse.data);

                } catch (err: any) {
                    console.error("Error fetching details:", err.message);
                    if (err.response) console.error(err.response.data);
                }

            } else {
                console.log("No banques found or unexpected format:", data);
            }

        } catch (error: any) {
            console.error("Error fetching banques list:", error?.message || error);
        }
    } catch (error: any) {
        console.error("Unexpected Script Error:", error);
    }
}

debugBanques();
