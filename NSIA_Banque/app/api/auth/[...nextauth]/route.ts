import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, "base64")
        .toString()
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "nsia-bancassurance-frontend",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
      issuer: process.env.KEYCLOAK_ISSUER || "http://localhost:8080/realms/master",
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        // Décoder le jeton d'accès pour extraire les claims spécifiques à NSIA
        const payload = decodeJwt(account.access_token);
        if (payload) {
          const tokenRoles = payload.roles || payload.realm_access?.roles || [];
          let userRole = "SUPPORT"; // Rôle par défaut
          
          if (tokenRoles.includes("NSIA_SUPER_ADMIN")) {
            userRole = "SUPER_ADMIN";
          } else if (tokenRoles.includes("NSIA_ADMIN")) {
            userRole = "ADMIN";
          } else if (tokenRoles.includes("BANK_SUPER_ADMIN")) {
            userRole = "RESPONSABLE_BANQUE";
          } else if (tokenRoles.includes("BANK_AGENCY_OPERATOR") || tokenRoles.includes("BANK_AGENCY_MANAGER")) {
            userRole = "GESTIONNAIRE";
          }

          const bankCode = payload.bank_id || payload.bank || "NSIA";
          
          token.user = {
            id: payload.sub,
            username: payload.preferred_username || payload.username || payload.sub,
            email: payload.email || "",
            nom: payload.family_name || payload.last_name || "",
            prenom: payload.given_name || payload.first_name || "",
            role: userRole,
            banque: {
              id: bankCode,
              code: bankCode.toUpperCase(),
              nom: `Banque ${bankCode.toUpperCase()}`,
              produits_disponibles: [], // Rempli dynamiquement par l'application
            },
            is_active: true,
          };
        }
      }

      // Si le token n'est pas expiré, on le retourne directement
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Si le token est expiré, tenter de le rafraîchir
      try {
        const response = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "nsia-bancassurance-frontend",
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET || "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
          method: "POST",
        });

        const tokens = await response.json();

        if (!response.ok) throw tokens;

        return {
          ...token,
          accessToken: tokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
          refreshToken: tokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      session.user = token.user;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
