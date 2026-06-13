"""
Services métier pour l'app Core.
Sépare la logique métier des vues pour une meilleure testabilité.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .models import PasswordResetToken, Utilisateur

security_logger = logging.getLogger('django.security')
logger = logging.getLogger('apps.core')


class PasswordResetService:
    """
    Orchestre le flow de réinitialisation de mot de passe.

    Responsabilités :
      • Créer un token sécurisé
      • Envoyer l'email de reset
      • Valider un token et changer le mot de passe
      • Logger chaque événement pour l'audit

    Sécurité :
      • Réponse identique que l'email existe ou non (anti-énumération)
      • Token SHA-256 hashé en base, jamais stocké en clair
      • Token à usage unique, expiration 15 minutes
      • Tous les anciens tokens invalidés à chaque nouvelle demande
    """

    # URL du frontend — configurable via settings
    FRONTEND_BASE_URL = getattr(
        settings, 'FRONTEND_BASE_URL',
        'https://nsia-bancassurances.vercel.app'
    )

    @classmethod
    def request_reset(cls, email: str, ip_address: str = None) -> bool:
        """
        Étape 1 : L'utilisateur demande un reset.

        - Cherche l'utilisateur par email (silencieusement)
        - Génère un token sécurisé
        - Envoie l'email
        - Log l'événement

        Retourne toujours True (anti-énumération).
        """
        try:
            utilisateur = Utilisateur.objects.get(
                email__iexact=email.strip(),
                est_actif=True,
            )
        except Utilisateur.DoesNotExist:
            # SÉCURITÉ : On log mais on ne révèle rien au client
            security_logger.info(
                f"Password reset demandé pour email inexistant ou inactif : "
                f"{email[:3]}***@*** (IP: {ip_address})"
            )
            return True  # Réponse identique

        # Générer le token
        plaintext, token_obj = PasswordResetToken.generate_for_user(
            utilisateur=utilisateur,
            ip_address=ip_address,
        )

        # Construire le lien de reset
        reset_link = f"{cls.FRONTEND_BASE_URL}/reset-password?token={plaintext}"

        # Envoyer l'email
        cls._send_reset_email(utilisateur, reset_link)

        security_logger.info(
            f"Password reset token généré pour {utilisateur.username} "
            f"(IP: {ip_address}, expire: {token_obj.date_expiration})"
        )

        return True

    @classmethod
    def confirm_reset(cls, token: str, new_password: str, ip_address: str = None):
        """
        Étape 2 : L'utilisateur confirme le reset avec le token + nouveau MDP.

        Retourne (success: bool, message: str).
        """
        token_obj, utilisateur = PasswordResetToken.verify_token(token)

        if token_obj is None:
            security_logger.warning(
                f"Password reset avec token invalide/expiré (IP: {ip_address})"
            )
            return False, "Le lien de réinitialisation est invalide ou a expiré."

        # Changer le mot de passe
        utilisateur.set_password(new_password)
        utilisateur.save(update_fields=['password'])

        # Consommer le token (usage unique)
        token_obj.consume(ip_address=ip_address)

        # Invalider tous les autres tokens restants de ce user
        PasswordResetToken.objects.filter(
            utilisateur=utilisateur,
            est_utilise=False,
        ).update(est_utilise=True)

        security_logger.info(
            f"Password reset confirmé pour {utilisateur.username} (IP: {ip_address})"
        )

        # Envoyer un email de notification
        cls._send_confirmation_email(utilisateur)

        return True, "Votre mot de passe a été réinitialisé avec succès."

    @classmethod
    def change_password(cls, user, old_password: str, new_password: str, ip_address: str = None):
        """
        Flow authentifié : l'utilisateur change son propre mot de passe.
        L'ancien mot de passe est déjà validé dans le serializer.
        """
        user.set_password(new_password)
        user.save(update_fields=['password'])

        security_logger.info(
            f"Password changé par {user.username} (IP: {ip_address})"
        )

        # Notification par email
        cls._send_password_changed_email(user)

        return True

    # ── Emails privés ───────────────────────────────────────────────

    @classmethod
    def _send_reset_email(cls, utilisateur, reset_link: str):
        """Envoie l'email contenant le lien de réinitialisation."""
        subject = "NSIA Bancassurance — Réinitialisation de votre mot de passe"

        html_message = render_to_string('emails/password_reset.html', {
            'utilisateur': utilisateur,
            'reset_link': reset_link,
            'expiration_minutes': PasswordResetToken.TOKEN_LIFETIME_MINUTES,
        })
        plain_message = strip_tags(html_message)

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[utilisateur.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Email de reset envoyé à {utilisateur.email}")
        except Exception as e:
            # On log l'erreur mais on ne la propage pas au client
            # (anti-énumération : le client ne doit pas savoir si l'email a échoué)
            logger.error(
                f"Échec d'envoi email de reset à {utilisateur.email}: {e}"
            )

    @classmethod
    def _send_confirmation_email(cls, utilisateur):
        """Notifie l'utilisateur que son mot de passe a été réinitialisé."""
        subject = "NSIA Bancassurance — Mot de passe réinitialisé"

        html_message = render_to_string('emails/password_reset_done.html', {
            'utilisateur': utilisateur,
        })
        plain_message = strip_tags(html_message)

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[utilisateur.email],
                html_message=html_message,
                fail_silently=True,
            )
        except Exception:
            pass  # Notification non critique

    @classmethod
    def _send_password_changed_email(cls, utilisateur):
        """Notifie l'utilisateur que son mot de passe a été changé (flow authentifié)."""
        subject = "NSIA Bancassurance — Votre mot de passe a été modifié"

        html_message = render_to_string('emails/password_changed.html', {
            'utilisateur': utilisateur,
        })
        plain_message = strip_tags(html_message)

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[utilisateur.email],
                html_message=html_message,
                fail_silently=True,
            )
        except Exception:
            pass  # Notification non critique
