-- Script to reset database tables for testing
-- Run this in your Supabase SQL editor if you want to start fresh

-- Delete all data (in correct order due to foreign keys)
DELETE FROM document_embeddings;
DELETE FROM comments;
DELETE FROM approvals;
DELETE FROM proposals;
DELETE FROM document_versions;
DELETE FROM documents;
DELETE FROM users;
DELETE FROM organizations;

-- Note: This doesn't delete auth.users - you may need to delete users 
-- from the Supabase Auth dashboard if you want to test registration again