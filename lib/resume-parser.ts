import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Cache for loaded libraries
let librariesCache: { mammoth: any; pdfParse: any } | null = null

/**
 * Load parsing libraries using require (server-side only)
 * These are marked as external in next.config.mjs to avoid webpack bundling issues
 */
function loadParsingLibraries() {
  if (typeof window !== 'undefined') {
    return { mammoth: null, pdfParse: null }
  }
  
  // Return cached libraries if already loaded
  if (librariesCache) {
    return librariesCache
  }
  
  let mammoth = null
  let pdfParse = null
  
  // Load mammoth
  try {
    mammoth = require("mammoth")
  } catch (err) {
    console.warn("Failed to load mammoth library:", err)
  }
  
  // Load pdf-parse separately to isolate errors
  try {
    pdfParse = require("pdf-parse")
  } catch (err) {
    console.warn("Failed to load pdf-parse library:", err)
  }
  
  librariesCache = { mammoth, pdfParse }
  return librariesCache
}

export interface ParsedResume {
  rawText: string
  name?: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  skills: string[]
  experience: Array<{
    company?: string
    title?: string
    location?: string
    startDate?: string
    endDate?: string
    description?: string
  }>
  education: Array<{
    school?: string
    degree?: string
    field?: string
    startYear?: string
    endYear?: string
  }>
  certifications?: string[]
  languages?: string[]
  links?: Array<{
    type: string
    url: string
  }>
}

/**
 * Clean text to remove null bytes and invalid UTF-8 sequences
 */
export function cleanText(text: string): string {
  // Remove null bytes and other problematic characters
  return text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim()
}

/**
 * Extract text from PDF or DOCX buffer
 */
async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  const type = (mimeType || "").toLowerCase()
  
  // Load libraries
  const libs = loadParsingLibraries()
  
  try {
    let rawText = ""
    
    // PDF files
    if (type.includes("pdf") || type.includes("application/pdf")) {
      if (!libs.pdfParse) {
        throw new Error("PDF parsing library not available")
      }
      const data = await libs.pdfParse(buffer)
      rawText = (data.text || "").trim()
    }
    // Word documents
    else if (
      type.includes("word") ||
      type.includes("docx") ||
      type.includes("msword") ||
      type.includes("officedocument")
    ) {
      if (!libs.mammoth) {
        console.warn("Mammoth library not available, using basic text extraction")
        // Fallback: try to extract text from buffer
        // DOCX files are ZIP archives, this won't work perfectly but better than nothing
        rawText = buffer.toString("utf8")
          .replace(/PK[\x00-\xff]{2,}/g, '') // Remove ZIP headers
          .replace(/<[^>]+>/g, ' ') // Remove XML tags
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      } else {
        const { value } = await libs.mammoth.extractRawText({ buffer })
        rawText = (value || "").trim()
      }
    }
    // Plain text files
    else if (type.includes("text") || type.includes("txt")) {
      rawText = buffer.toString("utf8").trim()
    }
    // Fallback: try to read as text
    else {
      rawText = buffer.toString("utf8").trim()
    }
    
    // Clean the text to remove null bytes and invalid characters
    return cleanText(rawText)
  } catch (error) {
    console.error("Text extraction error:", error)
    // Last resort fallback
    try {
      const fallbackText = buffer.toString("utf8").trim()
      return cleanText(fallbackText)
    } catch {
      throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Parse resume using OpenAI to extract structured data
 */
export async function parseResume(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ParsedResume> {
  // Extract raw text from file
  const rawText = await extractText(fileBuffer, mimeType)
  
  if (!rawText || rawText.length < 50) {
    throw new Error("Could not extract meaningful text from resume")
  }

  // Check if OpenAI is available
  const hasOpenAI = !!(process.env as any)?.OPENAI_API_KEY
  
  if (!hasOpenAI) {
    // Fallback: return raw text with basic parsing
    return {
      rawText,
      skills: extractBasicSkills(rawText),
      experience: [],
      education: [],
    }
  }

  // Truncate resume text to avoid token limits
  // GPT-4o has 30,000 TPM limit, keep resume under ~20,000 characters (~5,000 tokens)
  const maxChars = 20000
  const truncatedText = rawText.length > maxChars 
    ? rawText.substring(0, maxChars) + "\n\n[Resume truncated due to length...]"
    : rawText

  // Use OpenAI to parse resume into structured format
  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are a resume parser. Extract structured information from resumes and return valid JSON only.`,
      prompt: `
Parse this resume and extract all relevant information. Return ONLY valid JSON with no markdown formatting.

RESUME TEXT:
${truncatedText}

Return this exact JSON structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "summary": "Professional summary or objective",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, Country",
      "startDate": "Jan 2020",
      "endDate": "Present",
      "description": "Job responsibilities and achievements"
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "startYear": "2016",
      "endYear": "2020"
    }
  ],
  "certifications": ["AWS Certified", "PMP"],
  "languages": ["English", "Spanish"],
  "links": [
    {"type": "linkedin", "url": "https://linkedin.com/in/username"},
    {"type": "github", "url": "https://github.com/username"}
  ]
}

Rules:
- Extract ALL skills mentioned (technical, soft skills, tools, frameworks, languages)
- Include all work experience with dates
- Parse education history
- Find LinkedIn, GitHub, portfolio URLs
- If a field is not found, omit it or use null
- Return ONLY the JSON object, no markdown code blocks
      `.trim(),
    })

    // Clean and parse JSON response
    let jsonText = text.trim()
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
    
    // Extract JSON object
    const match = jsonText.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error("No valid JSON found in response")
    }
    
    const parsed = JSON.parse(match[0])
    
    // Validate and normalize the parsed data
    const result: ParsedResume = {
      rawText,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
      location: typeof parsed.location === "string" ? parsed.location : undefined,
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.filter((s: any) => typeof s === "string")
        : extractBasicSkills(rawText),
      experience: Array.isArray(parsed.experience)
        ? parsed.experience.map((exp: any) => ({
            company: typeof exp?.company === "string" ? exp.company : undefined,
            title: typeof exp?.title === "string" ? exp.title : undefined,
            location: typeof exp?.location === "string" ? exp.location : undefined,
            startDate: typeof exp?.startDate === "string" ? exp.startDate : undefined,
            endDate: typeof exp?.endDate === "string" ? exp.endDate : undefined,
            description: typeof exp?.description === "string" ? exp.description : undefined,
          }))
        : [],
      education: Array.isArray(parsed.education)
        ? parsed.education.map((edu: any) => ({
            school: typeof edu?.school === "string" ? edu.school : undefined,
            degree: typeof edu?.degree === "string" ? edu.degree : undefined,
            field: typeof edu?.field === "string" ? edu.field : undefined,
            startYear: typeof edu?.startYear === "string" ? edu.startYear : undefined,
            endYear: typeof edu?.endYear === "string" ? edu.endYear : undefined,
          }))
        : [],
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications.filter((c: any) => typeof c === "string")
        : undefined,
      languages: Array.isArray(parsed.languages)
        ? parsed.languages.filter((l: any) => typeof l === "string")
        : undefined,
      links: Array.isArray(parsed.links)
        ? parsed.links
            .map((link: any) => ({
              type: typeof link?.type === "string" ? link.type : "other",
              url: typeof link?.url === "string" ? link.url : "",
            }))
            .filter((l: { type: string; url: string }) => l.url)
        : undefined,
    }

    return result
  } catch (error) {
    console.error("AI resume parsing error:", error)
    
    // Fallback to basic parsing
    return {
      rawText,
      skills: extractBasicSkills(rawText),
      experience: [],
      education: [],
    }
  }
}

/**
 * Basic skill extraction fallback (keyword matching)
 */
function extractBasicSkills(text: string): string[] {
  const commonSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Ruby", "PHP", "Go", "Rust",
    "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring",
    "HTML", "CSS", "SASS", "Tailwind", "Bootstrap",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD",
    "Git", "GitHub", "GitLab", "Agile", "Scrum",
    "REST API", "GraphQL", "Microservices",
    "Machine Learning", "AI", "Data Science", "TensorFlow", "PyTorch",
  ]
  
  const textLower = text.toLowerCase()
  const found = new Set<string>()
  
  for (const skill of commonSkills) {
    if (textLower.includes(skill.toLowerCase())) {
      found.add(skill)
    }
  }
  
  return Array.from(found)
}
