-- Add production version tracking to documents
-- This allows us to mark a specific version as the "production" or "published" version

-- Add production_version_id to documents table
ALTER TABLE documents 
ADD COLUMN production_version_id UUID REFERENCES document_versions(id);

-- Add status field to document_versions table
ALTER TABLE document_versions
ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'production', 'archived'));

-- Add index for performance
CREATE INDEX idx_documents_production_version ON documents(production_version_id);
CREATE INDEX idx_document_versions_status ON document_versions(status);

-- Update existing versions to have draft status (already default, but being explicit)
UPDATE document_versions SET status = 'draft' WHERE status IS NULL;

-- Function to promote a version to production
CREATE OR REPLACE FUNCTION promote_version_to_production(
  p_document_id UUID,
  p_version_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_previous_production_id UUID;
BEGIN
  -- Check if user has access to the document
  IF NOT EXISTS (
    SELECT 1 FROM documents d
    JOIN users u ON u.org_id = d.org_id
    WHERE d.id = p_document_id AND u.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied to document';
  END IF;

  -- Get current production version if exists
  SELECT production_version_id INTO v_previous_production_id
  FROM documents
  WHERE id = p_document_id;

  -- Begin transaction
  BEGIN
    -- Set previous production version to archived if exists
    IF v_previous_production_id IS NOT NULL THEN
      UPDATE document_versions
      SET status = 'archived'
      WHERE id = v_previous_production_id;
    END IF;

    -- Set new version as production
    UPDATE document_versions
    SET status = 'production'
    WHERE id = p_version_id AND document_id = p_document_id;

    -- Update document to point to new production version
    UPDATE documents
    SET production_version_id = p_version_id,
        updated_at = NOW()
    WHERE id = p_document_id;

    -- Return success with details
    v_result := json_build_object(
      'success', true,
      'document_id', p_document_id,
      'new_production_version_id', p_version_id,
      'previous_production_version_id', v_previous_production_id
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get version comparison data
CREATE OR REPLACE FUNCTION get_version_comparison(
  p_document_id UUID,
  p_version_id UUID,
  p_compare_with TEXT DEFAULT 'previous' -- 'previous' or 'production'
)
RETURNS JSON AS $$
DECLARE
  v_compare_version_id UUID;
  v_version_number INT;
  v_result JSON;
BEGIN
  -- Get the version number of the requested version
  SELECT version_number INTO v_version_number
  FROM document_versions
  WHERE id = p_version_id AND document_id = p_document_id;

  IF v_version_number IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Determine which version to compare with
  IF p_compare_with = 'production' THEN
    -- Compare with production version
    SELECT production_version_id INTO v_compare_version_id
    FROM documents
    WHERE id = p_document_id;
  ELSE
    -- Compare with previous version
    SELECT id INTO v_compare_version_id
    FROM document_versions
    WHERE document_id = p_document_id
      AND version_number = v_version_number - 1;
  END IF;

  -- Build comparison result
  SELECT json_build_object(
    'current_version', json_build_object(
      'id', cv.id,
      'version_number', cv.version_number,
      'status', cv.status,
      'created_at', cv.created_at,
      'author_id', cv.author_id,
      'change_summary', cv.change_summary
    ),
    'compare_version', CASE 
      WHEN pv.id IS NOT NULL THEN json_build_object(
        'id', pv.id,
        'version_number', pv.version_number,
        'status', pv.status,
        'created_at', pv.created_at,
        'author_id', pv.author_id,
        'change_summary', pv.change_summary
      )
      ELSE NULL
    END
  ) INTO v_result
  FROM document_versions cv
  LEFT JOIN document_versions pv ON pv.id = v_compare_version_id
  WHERE cv.id = p_version_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for the new functions
GRANT EXECUTE ON FUNCTION promote_version_to_production TO authenticated;
GRANT EXECUTE ON FUNCTION get_version_comparison TO authenticated;