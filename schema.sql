


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."increment_candidate_time"("p_id" "uuid", "p_seconds" integer) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE candidates
  SET user_review_time_seconds = COALESCE(user_review_time_seconds, 0) + p_seconds
  WHERE id = p_id;
$$;


ALTER FUNCTION "public"."increment_candidate_time"("p_id" "uuid", "p_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_positioning_time"("p_id" "uuid", "p_seconds" integer) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE positionings
  SET user_time_seconds = COALESCE(user_time_seconds, 0) + p_seconds
  WHERE id = p_id;
$$;


ALTER FUNCTION "public"."increment_positioning_time"("p_id" "uuid", "p_seconds" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_usage_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "candidate_id" "uuid",
    "positioning_id" "uuid",
    "operation" character varying(50) NOT NULL,
    "ai_model" character varying(100) NOT NULL,
    "duration_ms" integer NOT NULL,
    "input_tokens" integer,
    "output_tokens" integer,
    "cache_read_tokens" integer,
    "cache_write_tokens" integer,
    "reasoning_tokens" integer,
    "total_tokens" integer GENERATED ALWAYS AS ((COALESCE("input_tokens", 0) + COALESCE("output_tokens", 0))) STORED,
    "raw_usage" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_usage_log_operation_check" CHECK ((("operation")::"text" = ANY ((ARRAY['extraction'::character varying, 'analysis'::character varying, 'generation'::character varying])::"text"[])))
);


ALTER TABLE "public"."ai_usage_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "extracted_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "original_file_url" "text" NOT NULL,
    "formatted_file_url" "text",
    "status" character varying(50) DEFAULT 'uploaded'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "template_id" "uuid",
    "ai_extraction_duration_ms" integer,
    "user_review_time_seconds" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "candidates_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['uploaded'::character varying, 'extracting'::character varying, 'reviewing'::character varying, 'ready'::character varying, 'generated'::character varying])::"text"[])))
);


ALTER TABLE "public"."candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."extraction_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "candidate_id" "uuid",
    "extraction_result" "jsonb" NOT NULL,
    "ai_model" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."extraction_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."missions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "company" character varying(255),
    "job_description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."missions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positionings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "candidate_id" "uuid",
    "job_description" "text" NOT NULL,
    "analysis" "jsonb",
    "answers" "jsonb",
    "tailored_cv" "jsonb",
    "email" "jsonb",
    "tailored_file_url" "text",
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "candidate_email" "jsonb",
    "ai_analysis_duration_ms" integer,
    "ai_generation_duration_ms" integer,
    "user_time_seconds" integer DEFAULT 0 NOT NULL,
    "mission_id" "uuid"
);


ALTER TABLE "public"."positionings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) DEFAULT 'Sans titre'::character varying NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."extraction_history"
    ADD CONSTRAINT "extraction_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positionings"
    ADD CONSTRAINT "positionings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ai_usage_log_candidate" ON "public"."ai_usage_log" USING "btree" ("candidate_id");



CREATE INDEX "idx_ai_usage_log_created" ON "public"."ai_usage_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_usage_log_operation" ON "public"."ai_usage_log" USING "btree" ("operation");



CREATE INDEX "idx_ai_usage_log_positioning" ON "public"."ai_usage_log" USING "btree" ("positioning_id");



CREATE INDEX "idx_candidates_created_at" ON "public"."candidates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_candidates_extracted_data" ON "public"."candidates" USING "gin" ("extracted_data");



CREATE INDEX "idx_candidates_status" ON "public"."candidates" USING "btree" ("status");



CREATE INDEX "idx_extraction_candidate_id" ON "public"."extraction_history" USING "btree" ("candidate_id");



CREATE INDEX "idx_extraction_created_at" ON "public"."extraction_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_templates_created_at" ON "public"."templates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_templates_is_default" ON "public"."templates" USING "btree" ("is_default");



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_positioning_id_fkey" FOREIGN KEY ("positioning_id") REFERENCES "public"."positionings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."extraction_history"
    ADD CONSTRAINT "extraction_history_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."positionings"
    ADD CONSTRAINT "positionings_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."positionings"
    ADD CONSTRAINT "positionings_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE SET NULL;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."increment_candidate_time"("p_id" "uuid", "p_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_candidate_time"("p_id" "uuid", "p_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_candidate_time"("p_id" "uuid", "p_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_positioning_time"("p_id" "uuid", "p_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_positioning_time"("p_id" "uuid", "p_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_positioning_time"("p_id" "uuid", "p_seconds" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."ai_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "service_role";



GRANT ALL ON TABLE "public"."candidates" TO "anon";
GRANT ALL ON TABLE "public"."candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."candidates" TO "service_role";



GRANT ALL ON TABLE "public"."extraction_history" TO "anon";
GRANT ALL ON TABLE "public"."extraction_history" TO "authenticated";
GRANT ALL ON TABLE "public"."extraction_history" TO "service_role";



GRANT ALL ON TABLE "public"."missions" TO "anon";
GRANT ALL ON TABLE "public"."missions" TO "authenticated";
GRANT ALL ON TABLE "public"."missions" TO "service_role";



GRANT ALL ON TABLE "public"."positionings" TO "anon";
GRANT ALL ON TABLE "public"."positionings" TO "authenticated";
GRANT ALL ON TABLE "public"."positionings" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































