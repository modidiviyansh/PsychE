-- PsychE Version 3.0: Legacy Cleanup
-- This script permanently drops the PsychE_Assessment_Master table, which 
-- was used in V2.0 for the old "Smart Suggestions" component. 
-- The feature has been migrated to use PsychE_Modules.

DROP TABLE IF EXISTS "PsychE_Assessment_Master" CASCADE;
