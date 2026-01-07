-- Add images field to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN email_templates.images IS 'JSON array of image objects with URL, alt text, and blob data';

-- Update existing templates to have empty images array if needed
UPDATE email_templates
SET images = '[]'::jsonb
WHERE images IS NULL;

-- Create template_images table for storing large binary data separately
CREATE TABLE IF NOT EXISTS template_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  blob_data BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT template_images_unique_name UNIQUE(template_id, filename)
);

-- Add comments for documentation
COMMENT ON TABLE template_images IS 'Stores binary image data for email templates';
COMMENT ON COLUMN template_images.template_id IS 'Foreign key to email_templates';
COMMENT ON COLUMN template_images.filename IS 'Original filename of the uploaded image';
COMMENT ON COLUMN template_images.content_type IS 'MIME type of the image';
COMMENT ON COLUMN template_images.size IS 'Size of the image in bytes';
COMMENT ON COLUMN template_images.blob_data IS 'Binary image data stored as bytea';

-- Create index for faster lookups by template_id
CREATE INDEX IF NOT EXISTS idx_template_images_template_id ON template_images(template_id);
