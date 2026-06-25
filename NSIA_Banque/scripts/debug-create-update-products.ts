import { apiClient } from "../lib/api/client";
import { authApi } from "../lib/api/auth";
import { API_BASE_URL } from "../lib/utils/constants";

process.env.NEXT_PUBLIC_USE_MOCK = "false";

async function debugUpdateProducts() {
    console.log(`Debugging Banques Products Update on: ${API_BASE_URL}`);

    try {
        // 1. Authenticate
        console.log("Authenticating...");
        const authResponse = await authApi.login({ username: "super_admin", password: "Admin123!" });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authResponse.access}`;
        console.log("Authentication successful.");

        // 2. Create bank
        console.log("\nCreating temporary bank...");
        const tempBanqueData = {
            nom_complet: "TEST DEBUG PRODUCTS " + Date.now(),
            nom_court: "TDP",
            code_banque: "TDP" + Math.floor(Math.random() * 1000),
            email_contact: "test@debug.com",
            telephone_contact: "123456",
            adresse: "Nowhere",
            est_active: true,
            nb_utilisateurs: 0,
            produits_disponibles: ["mobateli"]
        };

        let bankId;
        try {
            const createRes = await apiClient.post("/api/v1/banques/", tempBanqueData);
            bankId = createRes.data.id;
            console.log(`Created Bank ID: ${bankId}`);

            // 3. Check products immediately
            console.log("Checking products after creation...");
            try {
                const initialProducts = await apiClient.get(`/api/v1/banques/${bankId}/produits/`);
                console.log("Initial Products:", initialProducts.data);
            } catch (e: any) {
                console.log("Could not fetch initial products:", e.message);
            }

            // 4. Attempt PATCH with 'produits_disponibles'
            console.log("\n[TEST 1] PATCH with 'produits_disponibles': ['mobateli']");
            try {
                await apiClient.patch(`/api/v1/banques/${bankId}/`, { produits_disponibles: ["mobateli"] });
                const afterPatch1 = await apiClient.get(`/api/v1/banques/${bankId}/produits/`);
                console.log("Products after PATCH 1:", afterPatch1.data);
            } catch (e: any) {
                console.log("PATCH 1 Failed:", e.message);
            }

            // 5. Attempt PATCH with 'produits'
            console.log("\n[TEST 2] PATCH with 'produits': ['epargne_plus']");
            try {
                await apiClient.patch(`/api/v1/banques/${bankId}/`, { produits: ["epargne_plus"] });
                const afterPatch2 = await apiClient.get(`/api/v1/banques/${bankId}/produits/`);
                console.log("Products after PATCH 2:", afterPatch2.data);
            } catch (e: any) {
                console.log("PATCH 2 Failed:", e.message);
            }

            // 6. Attempt PATCH with 'products'
            console.log("\n[TEST 3] PATCH with 'products': ['emprunteur']");
            try {
                await apiClient.patch(`/api/v1/banques/${bankId}/`, { products: ["emprunteur"] });
                const afterPatch3 = await apiClient.get(`/api/v1/banques/${bankId}/produits/`);
                console.log("Products after PATCH 3:", afterPatch3.data);
            } catch (e: any) {
                console.log("PATCH 3 Failed:", e.message);
            }

            // 7. Cleanup
            console.log("\nCleaning up (Deleting bank)...");
            await apiClient.delete(`/api/v1/banques/${bankId}/`);
            console.log("Bank deleted.");

        } catch (err: any) {
            console.error("Operation failed:", err.message);
            if (err.response) console.error(err.response.data);
            // Cleanup in case of error if ID exists
            if (bankId) {
                try { await apiClient.delete(`/api/v1/banques/${bankId}/`); } catch (e) { }
            }
        }

    } catch (error: any) {
        console.error("Unexpected Script Error:", error);
    }
}

debugUpdateProducts();
