-- Function to get driver rankings by date range
-- This should be executed in your Supabase SQL Editor

-- Function to return driver rankings within a date range
CREATE OR REPLACE FUNCTION get_driver_rankings(
  start_date TEXT,
  end_date TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  driver_id TEXT,
  name TEXT,
  trip_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.driver_id,
    dr.name,
    COUNT(dr.id) AS trip_count
  FROM 
    dispatch_records dr
  WHERE 
    dr.start_time >= start_date::timestamptz
    AND dr.start_time <= end_date::timestamptz
  GROUP BY 
    dr.driver_id, dr.name
  HAVING 
    COUNT(dr.id) > 0
  ORDER BY 
    trip_count DESC
  LIMIT 
    limit_count;
END;
$$;

-- Instructions for Supabase:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste the above code and execute it
-- 5. Test with:
--    SELECT * FROM get_driver_rankings('2023-01-01', '2023-12-31', 10); 