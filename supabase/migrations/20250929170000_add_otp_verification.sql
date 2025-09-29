-- Create table for OTP verification tracking
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.project_codes(id) ON DELETE CASCADE,
  freelancer_identifier TEXT, -- Could be email, name, or any identifier
  verification_attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for OTP verification access
CREATE POLICY "Anyone can insert OTP verification attempts" 
ON public.otp_verifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view OTP verification status" 
ON public.otp_verifications 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update OTP verification attempts" 
ON public.otp_verifications 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_otp_verifications_updated_at
BEFORE UPDATE ON public.otp_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for OTP verifications
ALTER TABLE public.otp_verifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.otp_verifications;

-- Add column to project_codes to track if it allows OTP access
ALTER TABLE public.project_codes 
ADD COLUMN allows_freelancer_access BOOLEAN DEFAULT true;