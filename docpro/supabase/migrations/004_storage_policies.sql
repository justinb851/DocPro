-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload documents to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents from their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents from their org" ON storage.objects;

-- Create storage policies for documents bucket
CREATE POLICY "Allow authenticated uploads to documents bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated reads from documents bucket"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated updates to documents bucket"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated deletes from documents bucket"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);