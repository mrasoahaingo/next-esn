-- Suppression des objets du radar de prospection, retiré du produit (commit 7ecd35e,
-- puis quick 261124-lfg). Les 7 anciennes migrations radar restent inchangées.
--
-- NE PAS appliquer en production sans l'accord explicite de l'utilisateur.
--
-- Choix volontaires :
-- - l'extension pgvector (20260401102200_001_enable_pgvector.sql) est CONSERVÉE :
--   elle devient inerte une fois les objets radar partis, et une future refonte
--   de la prospection pourrait s'en servir ;
-- - pas de CASCADE : si un objet inconnu dépend d'un objet radar, la migration
--   échoue bruyamment au lieu de l'emporter en silence ;
-- - pas de DROP POLICY / DROP INDEX : ils partent avec leurs tables, et un
--   DROP POLICY sur une table absente casserait l'idempotence ;
-- - tout est qualifié public. : les noms de types sont génériques.
--
-- Ordre : la fonction (son type de retour référence availability_status), puis les
-- tables (enfants avant parents), puis les types.

DROP FUNCTION IF EXISTS public.match_consultants(vector, text, double precision, integer);

DROP TABLE IF EXISTS public.radar_matches;
DROP TABLE IF EXISTS public.radar_signals;
DROP TABLE IF EXISTS public.radar_prospect_scores;
DROP TABLE IF EXISTS public.radar_actions;
DROP TABLE IF EXISTS public.radar_consultants;
DROP TABLE IF EXISTS public.radar_companies;
DROP TABLE IF EXISTS public.radar_run_logs;
DROP TABLE IF EXISTS public.radar_org_settings;

DROP TYPE IF EXISTS public.signal_source;
DROP TYPE IF EXISTS public.heat_level;
DROP TYPE IF EXISTS public.availability_status;
DROP TYPE IF EXISTS public.action_type;
DROP TYPE IF EXISTS public.action_outcome;
DROP TYPE IF EXISTS public.radar_source;
