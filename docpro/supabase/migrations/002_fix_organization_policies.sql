-- Add missing RLS policies for organizations and users tables

-- Allow authenticated users to create organizations (for registration/migration)
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to create their own user record
CREATE POLICY "Users can insert own user record" ON users
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- Allow users to update their own user record
CREATE POLICY "Users can update own user record" ON users
  FOR UPDATE 
  USING (id = auth.uid());