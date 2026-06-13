from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                -- Activation de RLS sur la table audit_logs
                ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
                ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS audit_logs_tenant_policy ON audit_logs;
                CREATE POLICY audit_logs_tenant_policy ON audit_logs
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR banque_id::text = current_setting('app.current_banque_id', true)
                    );
            """,
            reverse_sql="""
                ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
                ALTER TABLE audit_logs NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS audit_logs_tenant_policy ON audit_logs;
            """
        )
    ]
