<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false showAnotherWayIfPresent=true displayWide=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}">

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
</head>

<body class="${properties.kcBodyClass!} ${bodyClass}">
<div class="login-split-container">
    
    <!-- LEFT SIDE: Auth Card & Branding -->
    <div class="login-left-panel">
        <div class="login-left-content">
            
            <!-- Dual Branding Header -->
            <div class="dual-branding">
                <div class="nsia-logo-container">
                    <img src="${url.resourcesPath}/img/nsia-logo.png" alt="NSIA Vie Assurances" class="nsia-logo">
                </div>
                
                <#assign bankName = (realm.name?lower_case?replace("bank_", ""))!"">
                <#if bankName?has_content && bankName != "master">
                    <span class="branding-separator">×</span>
                    <div class="bank-logo-container">
                        <img src="${url.resourcesPath}/img/logo-${bankName}.png" alt="${realm.displayName!bankName}" class="bank-logo" onerror="this.style.display='none'; document.getElementById('bank-text-logo').style.display='block';">
                        <span id="bank-text-logo" class="bank-text-logo" style="display:none;">${realm.displayName!bankName}</span>
                    </div>
                </#if>
            </div>
            
            <!-- Institutional Title -->
            <h1 class="institutional-title">${realm.displayName!'NSIA Vie Assurances'}</h1>
            
            <!-- Main Login Box Card -->
            <div class="login-box-card">
                <!-- Header -->
                <header class="login-box-header">
                    <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
                        <h2 class="login-box-title"><#nested "header"></h2>
                    <#else>
                        <h2 class="login-box-title"><#nested "header"></h2>
                        <div class="username-display-wrapper">
                            <span class="username-display">${auth.attemptedUsername}</span>
                            <a class="username-reset-link" href="${url.loginRestartFlowUrl}">
                                <span>${msg("restartLoginTooltip")}</span>
                            </a>
                        </div>
                    </#if>
                </header>
                
                <!-- Alert Messages -->
                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <div class="alert-banner alert-${message.type}">
                        <div class="alert-icon">
                            <#if message.type = 'success'>✅
                            <#elseif message.type = 'warning'>⚠️
                            <#elseif message.type = 'error'>🛑
                            <#else>ℹ️
                            </#if>
                        </div>
                        <div class="alert-text">${kcSanitize(message.summary)?no_esc}</div>
                    </div>
                </#if>

                <!-- Form Content -->
                <div class="login-box-body">
                    <#nested "form">
                </div>

                <!-- Info Section -->
                <#if displayInfo>
                    <div class="login-box-info">
                        <#nested "info">
                    </div>
                </#if>
            </div>
            
            <!-- Secure Connection Callout Box -->
            <div class="secure-callout-box">
                <div class="secure-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                </div>
                <div class="secure-text-content">
                    <h3 class="secure-title">Connexion sécurisée</h3>
                    <p class="secure-desc">Vos identifiants sont chiffrés et protégés. Nous utilisons les dernières technologies de sécurité pour protéger vos données.</p>
                </div>
            </div>

            <!-- Footer Legal -->
            <footer class="login-left-footer">
                Sécurisé et confidentiel
            </footer>
        </div>
    </div>
    
    <!-- RIGHT SIDE: Presentational Panel -->
    <div class="login-right-panel">
        <div class="grid-overlay"></div>
        <div class="login-right-content">
            <span class="badge-secure">
                <span class="badge-dot"></span> Plateforme sécurisée
            </span>
            <h1 class="welcome-heading">Bienvenue sur la <br>plateforme <span class="highlight-text">NSIA</span></h1>
            <p class="welcome-desc">Gérez vos simulations d'assurance et souscriptions en toute simplicité pour vos clients.</p>
            
            <!-- Features list -->
            <div class="features-list">
                <div class="feature-item-card">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div class="feature-text">
                        <h4 class="feature-title">Gestion simplifiée</h4>
                        <p class="feature-desc">Créez et gérez vos simulations en quelques clics</p>
                    </div>
                </div>
                
                <div class="feature-item-card">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                    </div>
                    <div class="feature-text">
                        <h4 class="feature-title">Sécurité renforcée</h4>
                        <p class="feature-desc">Vos données sont protégées avec les meilleurs standards</p>
                    </div>
                </div>
                
                <div class="feature-item-card">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                    </div>
                    <div class="feature-text">
                        <h4 class="feature-title">Performance optimale</h4>
                        <p class="feature-desc">Interface rapide et réactive pour une expérience fluide</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
</div>
</body>
</html>
</#macro>
