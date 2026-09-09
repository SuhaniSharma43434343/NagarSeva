-- Run as a database administrator after the Prisma schema is migrated.
-- Create a dedicated LOGIN separately and set its password through your DB provider.
-- Grant this group role to that LOGIN: GRANT nagarseva_reader TO your_agent_login;
-- Do NOT grant the agent the database owner's role or use the backend's login.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nagarseva_reader') THEN
    CREATE ROLE nagarseva_reader NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO nagarseva_reader;
GRANT SELECT ON "Ward", "Route", "Issue", "IssueAnalysis", "IssueAssignment",
  "IssueResolution", "RouteAssignment", "SurveySession" TO nagarseva_reader;
-- Deliberately exclude User (password hashes and personal account information).
