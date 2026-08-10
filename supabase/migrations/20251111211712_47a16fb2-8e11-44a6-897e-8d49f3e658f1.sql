-- Create rate limiting table for API endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, endpoint)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only view their own rate limits
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- System can manage rate limits (edge functions use service role)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (true);

-- Create function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _endpoint TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count INTEGER;
  _window_start TIMESTAMP WITH TIME ZONE;
  _now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get current rate limit entry
  SELECT request_count, window_start
  INTO _current_count, _window_start
  FROM public.rate_limits
  WHERE user_id = _user_id AND endpoint = _endpoint;
  
  -- If no entry exists or window expired, create/reset entry
  IF _current_count IS NULL OR (_now - _window_start) > (_window_seconds || ' seconds')::INTERVAL THEN
    INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (_user_id, _endpoint, 1, _now)
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET request_count = 1, window_start = _now;
    RETURN TRUE;
  END IF;
  
  -- Check if limit exceeded
  IF _current_count >= _max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE public.rate_limits
  SET request_count = request_count + 1
  WHERE user_id = _user_id AND endpoint = _endpoint;
  
  RETURN TRUE;
END;
$$;