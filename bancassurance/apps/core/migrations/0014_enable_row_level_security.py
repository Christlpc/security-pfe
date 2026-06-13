from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_rename_core_logina_usernam_idx_core_logina_usernam_f4a0b6_idx_and_more'),
        ('simulateur', '0015_simulation_email_client_hash_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                -- 1. Table simulateur_simulation
                ALTER TABLE simulateur_simulation ENABLE ROW LEVEL SECURITY;
                ALTER TABLE simulateur_simulation FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS simulation_tenant_policy ON simulateur_simulation;
                CREATE POLICY simulation_tenant_policy ON simulateur_simulation
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR banque_id::text = current_setting('app.current_banque_id', true)
                    );

                -- 2. Table simulateur_souscription
                ALTER TABLE simulateur_souscription ENABLE ROW LEVEL SECURITY;
                ALTER TABLE simulateur_souscription FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS souscription_tenant_policy ON simulateur_souscription;
                CREATE POLICY souscription_tenant_policy ON simulateur_souscription
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR banque_id::text = current_setting('app.current_banque_id', true)
                    );

                -- 3. Table questionnaire_medical
                ALTER TABLE questionnaire_medical ENABLE ROW LEVEL SECURITY;
                ALTER TABLE questionnaire_medical FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS questionnaire_tenant_policy ON questionnaire_medical;
                CREATE POLICY questionnaire_tenant_policy ON questionnaire_medical
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR EXISTS (
                            SELECT 1 FROM simulateur_simulation s
                            WHERE s.id = questionnaire_medical.simulation_id
                            AND s.banque_id::text = current_setting('app.current_banque_id', true)
                        )
                    );

                -- 4. Table agences
                ALTER TABLE agences ENABLE ROW LEVEL SECURITY;
                ALTER TABLE agences FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS agences_tenant_policy ON agences;
                CREATE POLICY agences_tenant_policy ON agences
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR banque_id::text = current_setting('app.current_banque_id', true)
                    );

                -- 5. Table core_utilisateur
                ALTER TABLE core_utilisateur ENABLE ROW LEVEL SECURITY;
                ALTER TABLE core_utilisateur FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS utilisateur_tenant_policy ON core_utilisateur;
                CREATE POLICY utilisateur_tenant_policy ON core_utilisateur
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR banque_id::text = current_setting('app.current_banque_id', true)
                    );

                -- 6. Table beneficiaires
                ALTER TABLE beneficiaires ENABLE ROW LEVEL SECURITY;
                ALTER TABLE beneficiaires FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS beneficiaires_tenant_policy ON beneficiaires;
                CREATE POLICY beneficiaires_tenant_policy ON beneficiaires
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR EXISTS (
                            SELECT 1 FROM simulateur_simulation s
                            WHERE s.id = beneficiaires.simulation_id
                            AND s.banque_id::text = current_setting('app.current_banque_id', true)
                        )
                    );

                -- 7. Table details_q2
                ALTER TABLE details_q2 ENABLE ROW LEVEL SECURITY;
                ALTER TABLE details_q2 FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS details_q2_tenant_policy ON details_q2;
                CREATE POLICY details_q2_tenant_policy ON details_q2
                    FOR ALL
                    USING (
                        current_setting('app.bypass_rls', true) = 'true'
                        OR EXISTS (
                            SELECT 1 FROM questionnaire_medical qm
                            JOIN simulateur_simulation s ON s.id = qm.simulation_id
                            WHERE qm.id = details_q2.questionnaire_id
                            AND s.banque_id::text = current_setting('app.current_banque_id', true)
                        )
                    );
            """,
            reverse_sql="""
                ALTER TABLE simulateur_simulation DISABLE ROW LEVEL SECURITY;
                ALTER TABLE simulateur_simulation NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS simulation_tenant_policy ON simulateur_simulation;

                ALTER TABLE simulateur_souscription DISABLE ROW LEVEL SECURITY;
                ALTER TABLE simulateur_souscription NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS souscription_tenant_policy ON simulateur_souscription;

                ALTER TABLE questionnaire_medical DISABLE ROW LEVEL SECURITY;
                ALTER TABLE questionnaire_medical NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS questionnaire_tenant_policy ON questionnaire_medical;

                ALTER TABLE agences DISABLE ROW LEVEL SECURITY;
                ALTER TABLE agences NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS agences_tenant_policy ON agences;

                ALTER TABLE core_utilisateur DISABLE ROW LEVEL SECURITY;
                ALTER TABLE core_utilisateur NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS utilisateur_tenant_policy ON core_utilisateur;

                ALTER TABLE beneficiaires DISABLE ROW LEVEL SECURITY;
                ALTER TABLE beneficiaires NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS beneficiaires_tenant_policy ON beneficiaires;

                ALTER TABLE details_q2 DISABLE ROW LEVEL SECURITY;
                ALTER TABLE details_q2 NO FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS details_q2_tenant_policy ON details_q2;
            """
        )
    ]
