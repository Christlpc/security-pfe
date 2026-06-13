def calculer_epargne_plus(prime_mensuelle, duree_ans, i=0.0304, gp=0.03, e=0.01, a=0.03, pen=0.05):
    """
    Calcule le capital acquis pour le produit Épargne Plus NSIA.
    Logique identique au fichier Excel Prime_Epargne_Plus.xlsx.

    Args:
        prime_mensuelle : cotisation mensuelle du client (FCFA)
        duree_ans       : durée du contrat en années (minimum 5)
        i               : taux d'intérêt annuel (défaut 3.04%)
        gp              : frais de gestion (défaut 3%)
        e               : frais de tirage (défaut 1%)
        a               : frais d'acquisition (défaut 3%)
        pen             : pénalité de rachat avant 10 ans (défaut 5%)

    Returns:
        dict avec capital_acquis, capital_apres_penalite,
             cumul_cotisations, interets_totaux
    """
    # Taux mensuel par équivalence composée
    ip = (1 + i) ** (1 / 12) - 1

    # Prime après déduction des frais (7% au total)
    prime_nette = prime_mensuelle * (1 - gp - e - a)

    n = int(duree_ans * 12)

    # Série G : capital début période (annuité-due)
    G = [0.0] * (n + 1)
    for m in range(1, n + 1):
        G[m] = (G[m - 1] + prime_nette) * (1 + ip)

    # Série H : intérêt cumulé (récursion du fichier Excel)
    H = [0.0] * (n + 1)
    H[1] = G[1] * ip
    for m in range(2, n):
        H[m] = G[m] * ((1 + ip) ** m - 1) - H[m - 1]

    # Dernier mois : au-delà de la durée, pas de nouveau dépôt
    G_dernier = G[n - 1] * (1 + ip)
    H[n] = G_dernier * ((1 + ip) ** n - 1) - H[n - 1]

    # Résultats
    capital = n * prime_nette + H[n]
    capital_apres_penalite = capital * (1 - pen) if duree_ans < 10 else capital

    return {
        "capital_acquis":         round(capital, 2),
        "capital_apres_penalite": round(capital_apres_penalite, 2),
        "cumul_cotisations":      prime_mensuelle * n,
        "interets_totaux":        round(capital - prime_nette * n, 2),
    }

print(calculer_epargne_plus(5000, 6))


"""0504445555
067737037 : O menu"""