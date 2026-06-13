from django.db import models
from django.conf import settings
import uuid
from apps.core.models import TenantManager

class AuditLog(models.Model):
    """
    Modèle de stockage pour les journaux d'audit de sécurité.
    Ce modèle est également cloisonné par tenant bancaire afin que
    les auditeurs d'une banque ne puissent voir que l'audit de leur propre banque.
    """
    objects = TenantManager()  # Cloisonnement automatique de l'audit par banque

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Contexte Utilisateur
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_audit'
    )
    username = models.CharField(max_length=150, blank=True)
    
    # Contexte Multi-Tenant
    banque = models.ForeignKey(
        'core.Banque',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_audit'
    )
    agence = models.ForeignKey(
        'core.Agence',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_audit'
    )
    
    # Détails de l'action
    action = models.CharField(max_length=100, db_index=True)  # ex: CREATE, UPDATE, DELETE, VIEW, LOGIN
    ressource_type = models.CharField(max_length=100, db_index=True)  # ex: Simulation, Souscription, Utilisateur
    ressource_id = models.CharField(max_length=100, blank=True, db_index=True)
    
    details = models.JSONField(default=dict, blank=True)
    resultat = models.CharField(max_length=20, default='SUCCESS', db_index=True)  # SUCCESS, FAILURE
    
    # Métadonnées techniques
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    correlation_id = models.CharField(max_length=100, blank=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        verbose_name = "Journal d'Audit"
        verbose_name_plural = "Journaux d'Audit"

    def __str__(self):
        user_str = self.username or 'Système'
        return f"{self.timestamp} - {user_str} - {self.action} sur {self.ressource_type} ({self.resultat})"
