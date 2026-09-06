-- ============================================================================
-- EasyX Supabase Storage Buckets & Storage RLS Configuration
-- ============================================================================

-- 1. Insert Storage Buckets if not already present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('kyc-documents', 'kyc-documents', FALSE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('kyc-selfies', 'kyc-selfies', FALSE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('deposit-proofs', 'deposit-proofs', FALSE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('support-attachments', 'support-attachments', FALSE, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']),
    ('promotions-media', 'promotions-media', TRUE, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Row Level Security

-- kyc-documents: Only applicant or admin can read/write
CREATE POLICY "Users can upload their own KYC docs"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own KYC docs or admins view all"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'kyc-documents' 
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin())
);

-- kyc-selfies
CREATE POLICY "Users can upload their own KYC selfies"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'kyc-selfies' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own KYC selfies or admins view all"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'kyc-selfies' 
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin())
);

-- deposit-proofs
CREATE POLICY "Users can upload deposit proofs"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'deposit-proofs' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own deposit proofs or admins view all"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'deposit-proofs' 
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin())
);

-- support-attachments
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'support-attachments' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own support attachments or admins view all"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'support-attachments' 
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR is_admin())
);

-- promotions-media: Public read, admin write
CREATE POLICY "Public read promotions media"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotions-media');

CREATE POLICY "Admins upload promotions media"
ON storage.objects FOR ALL
USING (bucket_id = 'promotions-media' AND is_admin());
