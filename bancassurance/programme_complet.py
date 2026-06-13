def calculer_epargne_plus(prime_mensuelle, duree_ans, i=0.0304, gp=0.03, e=0.01, a=0.03, pen=0.05):
    """
    Calcule le capital acquis Épargne Plus + tableau mensuel détaillé.
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
        dict :
            - capital_acquis            : capital total à la fin du contrat
            - capital_apres_penalite    : capital après déduction pénalité (si < 10 ans)
            - cumul_cotisations         : total des primes brutes versées
            - interets_totaux           : intérêts générés sur la durée
            - tableau                   : liste de dicts, un par mois (voir ci-dessous)

        Chaque élément du tableau contient :
            - mois              : numéro du mois (1 à n)
            - prime_brute       : cotisation mensuelle brute
            - cumul_primes      : cumul des primes brutes jusqu'à ce mois
            - prime_nette       : prime après déduction des frais
            - capital_debut     : capital en début de période (Vm,o)
            - interet_cumul     : intérêt cumulé jusqu'à ce mois
            - capital_fin       : capital en fin de période (Vm,f)
    """
    # Taux mensuel par équivalence composée
    ip = (1 + i) ** (1 / 12) - 1

    # Prime après déduction des frais (gp + e + a = 7%)
    prime_nette = prime_mensuelle * (1 - gp - e - a)

    n = int(duree_ans * 12)

    # Série G : capital début période (annuité-due)
    # G[0] = 0, G[m] = (G[m-1] + prime_nette) * (1 + ip)
    G = [0.0] * (n + 1)
    for m in range(1, n + 1):
        G[m] = (G[m - 1] + prime_nette) * (1 + ip)

    # Série H : intérêt cumulé
    H = [0.0] * (n + 1)
    H[1] = G[1] * ip
    for m in range(2, n):
        H[m] = G[m] * ((1 + ip) ** m - 1) - H[m - 1]
    # Dernier mois : G au-delà de la durée sans nouveau dépôt
    G_dernier = G[n - 1] * (1 + ip)
    H[n] = G_dernier * ((1 + ip) ** n - 1) - H[n - 1]

    # Tableau mensuel
    tableau = []
    for m in range(1, n + 1):
        tableau.append({
            "mois":          m,
            "prime_brute":   prime_mensuelle,
            "cumul_primes":  prime_mensuelle * m,
            "prime_nette":   round(prime_nette, 2),
            "capital_debut": round(G[m - 1], 2),
            "interet_cumul": round(H[m], 2),
            "capital_fin":   round(m * prime_nette + H[m], 2),
        })

    # Résumé
    capital = n * prime_nette + H[n]
    capital_apres_penalite = capital * (1 - pen) if duree_ans < 10 else capital

    return {
        "capital_acquis":         round(capital, 2),
        "capital_apres_penalite": round(capital_apres_penalite, 2),
        "cumul_cotisations":      prime_mensuelle * n,
        "interets_totaux":        round(capital - prime_nette * n, 2),
        "tableau":                tableau,
    }


print(calculer_epargne_plus(10000, 6))