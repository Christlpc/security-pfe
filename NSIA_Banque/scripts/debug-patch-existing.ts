import { apiClient } from "../lib/api/client";
import { authApi } from "../lib/api/auth";
import { API_BASE_URL } from "../lib/utils/constants";

process.env.NEXT_PUBLIC_USE_MOCK = "false";

async function debugPatchExisting() {
    console.log(`Debugging PATCH on Existing Bank: ${API_BASE_URL}`);

    try {
        // 1. Authenticate
        const authResponse = await authApi.login({ username: "super_admin", password: "Admin123!" });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authResponse.access}`;

        const bankId = "64beebf9-e78e-4273-b7e6-c1cb6506da92"; // BGFI

        // 1. Attempt PATCH / with parametres_specifiques
        console.log("\n[TEST] PATCH / with parametres_specifiques: { produits_disponibles: ['mobateli'] }");
        try {
            const patchRes = await apiClient.patch(`/api/v1/banques/${bankId}/`, {
                parametres_specifiques: { produits_disponibles: ["mobateli"] }
            });
            console.log("PATCH Status:", patchRes.status);
        } catch (err: any) {
            console.error("PATCH failed:", err.message);
        }

        // 2. Verify by fetching Detail (NOT /produits/)
        console.log("Verifying via GET /banques/{id}/...");
        try {
            const detailRes = await apiClient.get(`/api/v1/banques/${bankId}/`);
            console.log("Detail 'parametres_specifiques':", detailRes.data.parametres_specifiques);
            console.log("Detail 'produits_disponibles':", detailRes.data.produits_disponibles);
        } catch (e: any) { console.log("GET Detail failed:", e.message); }

    } catch (error: any) {
        console.error("Error:", error?.message);
        if (error.response) console.error(error.response.data);
    }
}

debugPatchExisting();
