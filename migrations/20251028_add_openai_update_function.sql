-- Function to update company with OpenAI project ID
CREATE OR REPLACE FUNCTION update_company_openai_project_id(
  company_id uuid,
  project_id text
) RETURNS void AS $$
BEGIN
  UPDATE companies 
  SET openai_project_id = project_id,
      updated_at = NOW()
  WHERE id = company_id;
END;
$$ LANGUAGE plpgsql;
