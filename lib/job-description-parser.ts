export interface JobDescriptionSchema {
  basic: {
    job_title: string;
    company: string;
    location: string;
    employment_type: string;
    seniority: string;
  };
  about_role: string;
  responsibilities: {
    day_to_day: string[];
    strategic: string[];
    stakeholders: string[];
    decision_scope: string;
  };
  requirements: {
    years_experience: string;
    education: string;
    must_have_skills: string[];
    nice_to_have_skills: string[];
    domain_knowledge: string;
    soft_skills: string[];
    languages: string[];
  };
  compensation: {
    salary_min: string;
    salary_max: string;
    period: string;
    bonus: string;
    perks: string[];
    time_off: string;
  };
  logistics: {
    joining_timeline: string;
    travel: string;
    work_authorization: string;
  };
}

export function parseJobDescription(jobDescription: string): JobDescriptionSchema {
  const text = jobDescription || '';
  
  // Helper functions
  const extractSection = (pattern: RegExp): string => {
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  };
  
  const extractList = (pattern: RegExp): string[] => {
    const match = text.match(pattern);
    if (!match) return [];
    return match[1]
      .split(/[•\n-]/)
      .map(item => item.trim())
      .filter(item => item && item.length > 0);
  };
  
  const normalizeEmploymentType = (type: string): string => {
    const normalized = type.toLowerCase().trim();
    if (normalized.includes('full') || normalized.includes('full-time')) return 'full-time';
    if (normalized.includes('part') || normalized.includes('part-time')) return 'part-time';
    if (normalized.includes('contract') || normalized.includes('freelance')) return 'contract';
    if (normalized.includes('intern')) return 'internship';
    return type;
  };
  
  const normalizeSeniority = (level: string): string => {
    const normalized = level.toLowerCase().trim();
    if (normalized.includes('junior') || normalized.includes('entry')) return 'junior';
    if (normalized.includes('mid') || normalized.includes('middle')) return 'mid';
    if (normalized.includes('senior') || normalized.includes('sr')) return 'senior';
    if (normalized.includes('lead') || normalized.includes('team lead')) return 'lead';
    if (normalized.includes('principal') || normalized.includes('staff')) return 'principal';
    return level;
  };
  
  const extractSalary = (text: string) => {
    const salaryMatch = text.match(/(?:salary|compensation)[:\s]*(?:₹|$|USD|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*[-–]\s*(?:₹|$|USD|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:per\s+)?(monthly|annually|yearly|month|year|annum)?/i);
    if (salaryMatch) {
      return {
        min: salaryMatch[1].replace(/,/g, ''),
        max: salaryMatch[2].replace(/,/g, ''),
        period: salaryMatch[3] ? (salaryMatch[3].includes('month') ? 'monthly' : 'annually') : ''
      };
    }
    return { min: '', max: '', period: '' };
  };

  // Extract basic information
  const jobTitle = extractSection(/(?:job title|position)[:\s*→]*\s*([^\n]+)/i) ||
                   extractSection(/^([^\n]+?)(?:\s*at\s|\s*-\s|\n)/i);
  
  const company = extractSection(/company[:\s*→]*\s*([^\n]+)/i);
  
  const location = extractSection(/location[:\s*→]*\s*([^\n]+)/i);
  
  const employmentType = normalizeEmploymentType(
    extractSection(/(?:work arrangement|employment type)[:\s*→]*\s*([^\n,]+)/i)
  );
  
  const seniority = normalizeSeniority(
    extractSection(/(?:job level|seniority|experience level)[:\s*→]*\s*([^\n]+)/i)
  );

  // Extract about role
  const aboutRole = extractSection(/about the role\s*\n(.*?)(?=\n(?:🔹|##|key responsibilities|requirements|compensation))/is);

  // Extract responsibilities
  const dayToDayResp = extractList(/(?:key responsibilities|day[- ]?to[- ]?day duties)[:\s]*\n(.*?)(?=\n(?:🔹|##|strategic|requirements|compensation))/is);
  const strategicResp = extractList(/strategic responsibilities[:\s]*\n(.*?)(?=\n(?:🔹|##|requirements|compensation))/is);
  
  const stakeholdersText = extractSection(/(?:collaborate with|stakeholders)[:\s]*([^\n]+)/i);
  const stakeholders = stakeholdersText ? stakeholdersText.split(/[,&]/).map(s => s.trim()).filter(Boolean) : [];
  
  const decisionScope = extractSection(/(?:decision scope|authority)[:\s]*([^\n]+)/i);

  // Extract requirements
  const yearsExp = extractSection(/(?:experience|years)[:\s]*([^\n]+)/i);
  const education = extractSection(/(?:education|degree)[:\s]*([^\n]+)/i);
  
  const mustHaveSkills = extractList(/(?:required skills|must[- ]?have|technical skills)[:\s]*\n(.*?)(?=\n(?:🔹|##|nice[- ]?to[- ]?have|preferred|compensation))/is);
  const niceToHaveSkills = extractList(/(?:preferred skills|nice[- ]?to[- ]?have)[:\s]*\n(.*?)(?=\n(?:🔹|##|compensation|logistics))/is);
  
  const domainKnowledge = extractSection(/domain knowledge[:\s]*([^\n]+)/i);
  const softSkills = extractList(/soft skills[:\s]*\n(.*?)(?=\n(?:🔹|##|languages|compensation))/is);
  const languages = extractList(/languages[:\s]*\n(.*?)(?=\n(?:🔹|##|compensation))/is);

  // Extract compensation
  const salaryInfo = extractSalary(text);
  const bonus = extractSection(/(?:bonus|incentives)[:\s]*([^\n]+)/i);
  const perks = extractList(/(?:perks|benefits)[:\s]*\n(.*?)(?=\n(?:🔹|##|time off|logistics))/is);
  const timeOff = extractSection(/time off[:\s]*([^\n]+)/i);

  // Extract logistics
  const joiningTimeline = extractSection(/joining timeline[:\s]*([^\n]+)/i);
  const travel = extractSection(/travel[:\s]*([^\n]+)/i);
  const workAuth = extractSection(/(?:work authorization|visa)[:\s]*([^\n]+)/i);

  return {
    basic: {
      job_title: jobTitle,
      company: company,
      location: location,
      employment_type: employmentType,
      seniority: seniority
    },
    about_role: aboutRole,
    responsibilities: {
      day_to_day: dayToDayResp,
      strategic: strategicResp,
      stakeholders: stakeholders,
      decision_scope: decisionScope
    },
    requirements: {
      years_experience: yearsExp,
      education: education,
      must_have_skills: mustHaveSkills,
      nice_to_have_skills: niceToHaveSkills,
      domain_knowledge: domainKnowledge,
      soft_skills: softSkills,
      languages: languages
    },
    compensation: {
      salary_min: salaryInfo.min,
      salary_max: salaryInfo.max,
      period: salaryInfo.period,
      bonus: bonus,
      perks: perks,
      time_off: timeOff
    },
    logistics: {
      joining_timeline: joiningTimeline,
      travel: travel,
      work_authorization: workAuth
    }
  };
}

export function renderLinkedInJobDescription(data: JobDescriptionSchema): string {
  const sections: string[] = [];
  
  // Helper to fix obvious typos
  const fixTypos = (text: string): string => {
    return text.replace(/Banaglore/gi, 'Bangalore');
  };
  
  // Helper to render bullet points
  const renderBullets = (items: string[]): string => {
    return items.filter(Boolean).map(item => `• ${fixTypos(item)}`).join('\n');
  };
  
  // 1) Title and subline
  if (data.basic.job_title) {
    sections.push(`**${fixTypos(data.basic.job_title)}**`);
    
    const sublineParts: string[] = [];
    if (data.basic.location) sublineParts.push(`📍 ${fixTypos(data.basic.location)}`);
    if (data.basic.company) sublineParts.push(`🏢 ${fixTypos(data.basic.company)}`);
    if (data.basic.employment_type) sublineParts.push(`💼 ${fixTypos(data.basic.employment_type)}`);
    if (data.basic.seniority) sublineParts.push(`🎯 ${fixTypos(data.basic.seniority)}`);
    
    if (sublineParts.length > 0) {
      sections.push(sublineParts.join(' | '));
    }
  }
  
  // 2) About the Role
  if (data.about_role) {
    sections.push(`\n**About the Role**\n${fixTypos(data.about_role)}`);
  }
  
  // 3) Key Responsibilities
  if (data.responsibilities.day_to_day.length > 0) {
    sections.push(`\n**Key Responsibilities**\n${renderBullets(data.responsibilities.day_to_day)}`);
  }
  
  // 4) Strategic Responsibilities
  if (data.responsibilities.strategic.length > 0) {
    sections.push(`\n**Strategic Responsibilities**\n${renderBullets(data.responsibilities.strategic)}`);
  }
  
  // 5) Stakeholders / Collaboration
  if (data.responsibilities.stakeholders.length > 0) {
    sections.push(`\n**Stakeholders / Collaboration**\n${renderBullets(data.responsibilities.stakeholders)}`);
  }
  
  // 6) Requirements
  const reqSections: string[] = [];
  if (data.requirements.years_experience) reqSections.push(`**Years of Experience:** ${fixTypos(data.requirements.years_experience)}`);
  if (data.requirements.education) reqSections.push(`**Education:** ${fixTypos(data.requirements.education)}`);
  if (data.requirements.must_have_skills.length > 0) reqSections.push(`**Must-Have Skills:**\n${renderBullets(data.requirements.must_have_skills)}`);
  if (data.requirements.nice_to_have_skills.length > 0) reqSections.push(`**Nice-to-Have Skills:**\n${renderBullets(data.requirements.nice_to_have_skills)}`);
  if (data.requirements.domain_knowledge) reqSections.push(`**Domain Knowledge:** ${fixTypos(data.requirements.domain_knowledge)}`);
  if (data.requirements.soft_skills.length > 0) reqSections.push(`**Soft Skills:**\n${renderBullets(data.requirements.soft_skills)}`);
  if (data.requirements.languages.length > 0) reqSections.push(`**Languages:**\n${renderBullets(data.requirements.languages)}`);
  
  if (reqSections.length > 0) {
    sections.push(`\n**Requirements**\n${reqSections.join('\n\n')}`);
  }
  
  // 7) Compensation & Benefits
  const compSections: string[] = [];
  if (data.compensation.salary_min && data.compensation.salary_max) {
    const salary = `${data.compensation.salary_min} – ${data.compensation.salary_max}${data.compensation.period ? ` ${data.compensation.period}` : ''}`;
    compSections.push(`**Salary:** ${salary}`);
  } else if (data.compensation.salary_min || data.compensation.salary_max) {
    const salary = data.compensation.salary_min || data.compensation.salary_max;
    compSections.push(`**Salary:** ${salary}${data.compensation.period ? ` ${data.compensation.period}` : ''}`);
  }
  if (data.compensation.bonus) compSections.push(`**Bonus/Incentives:** ${fixTypos(data.compensation.bonus)}`);
  if (data.compensation.perks.length > 0) compSections.push(`**Perks:**\n${renderBullets(data.compensation.perks)}`);
  if (data.compensation.time_off) compSections.push(`**Time Off:** ${fixTypos(data.compensation.time_off)}`);
  
  if (compSections.length > 0) {
    sections.push(`\n**Compensation & Benefits**\n${compSections.join('\n\n')}`);
  }
  
  // 8) Logistics
  const logSections: string[] = [];
  if (data.logistics.joining_timeline) logSections.push(`**Joining Timeline:** ${fixTypos(data.logistics.joining_timeline)}`);
  if (data.logistics.travel) logSections.push(`**Travel:** ${fixTypos(data.logistics.travel)}`);
  if (data.logistics.work_authorization) logSections.push(`**Work Authorization:** ${fixTypos(data.logistics.work_authorization)}`);
  
  if (logSections.length > 0) {
    sections.push(`\n**Logistics**\n${logSections.join('\n\n')}`);
  }
  
  const content = sections.join('\n');
  return `<<<JD_LINKEDIN_START>>>\n${content}\n<<<JD_LINKEDIN_END>>>`;
}
