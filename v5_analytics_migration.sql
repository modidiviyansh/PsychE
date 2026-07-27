-- Phase 1: Cold Start Gatekeeper
CREATE OR REPLACE FUNCTION psyche_get_engine_status(p_student_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_first_activity_date  TIMESTAMPTZ;
  v_last_session_date    TIMESTAMPTZ;
  v_completed_sessions   INTEGER;
  v_response_count       INTEGER;
  v_days_since_first     INTEGER;
BEGIN
  -- First activity = earliest completed session
  SELECT MIN(session_date) INTO v_first_activity_date
  FROM "PsychE_Counseling_Logs"
  WHERE student_uuid = p_student_uuid
  AND session_status = 'Completed';

  -- Last session and total completed sessions
  SELECT MAX(session_date), COUNT(*)
  INTO v_last_session_date, v_completed_sessions
  FROM "PsychE_Counseling_Logs"
  WHERE student_uuid = p_student_uuid
  AND session_status = 'Completed';

  -- Total responses mapped to this student
  SELECT COUNT(*) INTO v_response_count
  FROM "PsychE_Responses" r
  JOIN "PsychE_Counseling_Logs" cl ON cl.id = r.log_id
  WHERE cl.student_uuid = p_student_uuid;

  -- State 1: No activity at all
  IF v_completed_sessions = 0 AND v_response_count = 0 THEN
    RETURN 'cold_start';
  END IF;

  -- State 2: Sessions exist but no formal assessment ever
  IF v_completed_sessions > 0 AND v_response_count = 0 THEN
    RETURN 'assessment_only';
  END IF;

  -- State 3: Data has expired (90 days)
  IF v_last_session_date < NOW() - INTERVAL '90 days' THEN
    RETURN 'stale';
  END IF;

  v_days_since_first := EXTRACT(DAY FROM NOW() - v_first_activity_date);

  -- State 4: 15-day activation gate + minimum evidence threshold
  IF v_days_since_first < 15 OR v_completed_sessions < 3 OR v_response_count < 10 THEN
    RETURN 'warming';
  END IF;

  -- State 5: Full data available
  RETURN 'active';
END;
$$;

-- Phase 1: Nightly Batch Placeholder
CREATE OR REPLACE FUNCTION psyche_run_daily_batch()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Future metrics (ETI, SSI, School Aggregates) will be computed here.
  -- Currently wakes up the database and logs execution.
  PERFORM NOW();
END;
$$;
