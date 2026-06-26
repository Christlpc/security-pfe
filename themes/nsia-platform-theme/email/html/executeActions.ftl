<html>
<#if linkExpirationHours??>
  <#assign expirationHours = linkExpirationHours>
<#else>
  <#assign expirationSeconds = linkExpiration!43200>
  <#assign expirationHours = expirationSeconds / 3600>
</#if>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 40px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden; border-top: 4px solid #FFCC00;">
        <tr>
            <td style="padding: 35px 30px; text-align: center; background-color: #002D62;">
                <img src="https://4.223.87.112:30843/nsia.png" alt="NSIA Logo" style="max-height: 80px; border: 0;" />
                <h2 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">NSIA BANCASSURANCE</h2>
                <p style="color: #ffcc00; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Control Plane - SecOps Enforcer</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p style="margin-top: 0;">Bonjour,</p>
                <p>Votre compte d'accès à la plateforme unique de souscription **NSIA Bancassurance** a été provisionné avec succès par l'autorité centrale.</p>
                
                <p style="background-color: #fff9e6; border-left: 4px solid #ffcc00; padding: 15px; font-size: 14px; color: #665200;">
                    ⚠️ **Conformité Loi n° 29-2019 :** Pour des raisons strictes de sécurité et de non-répudiation, vous devez obligatoirement initialiser votre mot de passe et votre double facteur d'authentification (MFA) avant votre premier accès.
                </p>

                <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px auto;">
                    <tr>
                        <td align="center" style="border-radius: 4px; background-color: #002D62;">
                            <a href="${link}" target="_blank" style="padding: 14px 28px; display: inline-block; color: #ffffff; text-decoration: none; font-weight: bold;">
                                Initialiser mes accès sécurisés
                            </a>
                        </td>
                    </tr>
                </table>

                <p style="font-size: 13px; color: #888888;">Ce lien de sécurité est éphémère et expirera dans ${expirationHours?string("0.##")} ${((expirationHours > 1)?string("heures", "heure"))}.</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; font-size: 11px; color: #aaaaaa; text-align: center; border-top: 1px solid #eeeeee;">
                Ce message automatique est chiffré et tracé. Ne pas y répondre.<br>
                **Gouvernance SI NSIA Assurance** — Conforme aux exigences de la Loi n° 26-2019 relative à la cybersécurité.
            </td>
        </tr>
    </table>
</body>
</html>
