-- Function to cancel all pending dispatches and return drivers to inactive state
CREATE OR REPLACE FUNCTION cancel_pending_dispatches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Update all dispatch records in queue to cancelled
    UPDATE dispatch_records
    SET 
      status = 'cancelado',
      end_time = NOW()
    WHERE 
      status = 'en_cola';

    -- Update all drivers in queue to inactive
    UPDATE drivers
    SET 
      status = 'inactivo'
    WHERE 
      status = 'en_espera';

    -- If we get here, both operations succeeded
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on any error
      ROLLBACK;
      RAISE;
  END;
END;
$$; 