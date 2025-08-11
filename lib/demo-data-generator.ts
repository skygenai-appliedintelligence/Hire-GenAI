import { AIInterviewService, type CandidateApplication, type InterviewPipeline } from "./ai-interview-service"

export class DemoDataGenerator {
  static async generateSampleData() {
    // Sample candidate applications
    const sampleApplications: CandidateApplication[] = [
      {
        id: "candidate_demo_1",
        jobId: "job-1",
        fullName: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-0124",
        yearsOfExperience: "4-5",
        technicalSkills: "React, Node.js, TypeScript, AWS, MongoDB, Docker, GraphQL",
        whyInterested:
          "I'm excited about this opportunity because it combines my passion for full-stack development with the chance to work on cutting-edge AI-powered solutions. Your company's mission to revolutionize recruitment through technology aligns perfectly with my career goals.",
        impactfulProject:
          "Led the development of a real-time collaboration platform that increased team productivity by 40%. Built with React, Node.js, and WebSocket technology, serving 10,000+ daily active users.",
        availability: "2-weeks",
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "qualified",
      },
      {
        id: "candidate_demo_2",
        jobId: "job-1",
        fullName: "Michael Chen",
        email: "michael.chen@email.com",
        phone: "+1-555-0125",
        yearsOfExperience: "6-8",
        technicalSkills: "Vue.js, Python, Django, PostgreSQL, Redis, Kubernetes, CI/CD",
        whyInterested:
          "I'm drawn to this role because of the opportunity to work with advanced AI technologies and contribute to solving real-world recruitment challenges. The technical stack and company culture seem like a perfect fit for my skills and interests.",
        impactfulProject:
          "Architected and built a microservices-based e-commerce platform that handles 1M+ transactions daily. Implemented advanced caching strategies that reduced response times by 60%.",
        availability: "1-month",
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: "qualified",
      },
      {
        id: "candidate_demo_3",
        jobId: "job-2",
        fullName: "Emily Rodriguez",
        email: "emily.rodriguez@email.com",
        phone: "+1-555-0126",
        yearsOfExperience: "2-3",
        technicalSkills: "React, JavaScript, HTML5, CSS3, Sass, Webpack, Jest",
        whyInterested:
          "As a frontend developer passionate about creating exceptional user experiences, I'm excited about the opportunity to work on innovative recruitment tools that can make a real difference in people's careers.",
        impactfulProject:
          "Redesigned the user interface for a SaaS platform, resulting in a 35% increase in user engagement and 25% reduction in support tickets. Implemented responsive design and accessibility best practices.",
        availability: "immediately",
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: "qualified",
      },
    ]

    // Save applications
    localStorage.setItem("candidateApplications", JSON.stringify(sampleApplications))

    // Generate interview pipelines for qualified candidates
    const pipelines: InterviewPipeline[] = []

    for (const application of sampleApplications) {
      if (application.status === "qualified") {
        const pipeline = await AIInterviewService.createInterviewPipeline(application.id, application.jobId)

        // Simulate different stages of completion for demo
        if (application.id === "candidate_demo_1") {
          // Sarah - completed all stages
          pipeline.stages[0] = {
            ...pipeline.stages[0],
            status: "passed",
            score: 85,
            completedAt: new Date().toISOString(),
          }
          pipeline.stages[1] = {
            ...pipeline.stages[1],
            status: "passed",
            score: 92,
            completedAt: new Date().toISOString(),
          }
          pipeline.stages[2] = {
            ...pipeline.stages[2],
            status: "passed",
            score: 78,
            completedAt: new Date().toISOString(),
          }
          pipeline.stages[3] = {
            ...pipeline.stages[3],
            status: "passed",
            score: 88,
            completedAt: new Date().toISOString(),
          }
          pipeline.overallProgress = 100
          pipeline.currentStage = 3

          // Generate final recommendation
          pipeline.finalRecommendation = {
            decision: "recommend",
            overallScore: 86,
            successRate: 100,
            summary:
              "Sarah demonstrates exceptional technical skills and strong communication abilities. Her experience with modern web technologies and proven track record of delivering impactful projects make her an excellent fit for our team.",
            strengths: [
              "Strong technical communication skills",
              "Proven problem-solving approach",
              "Excellent project leadership experience",
              "Modern technology stack expertise",
            ],
            weaknesses: [
              "Could benefit from more cloud architecture experience",
              "Limited experience with AI/ML technologies",
            ],
            reasoning:
              "Based on consistent high performance across all interview stages, Sarah shows the technical competency, cultural fit, and leadership potential we're looking for in a senior developer role.",
          }
        } else if (application.id === "candidate_demo_2") {
          // Michael - in progress
          pipeline.stages[0] = {
            ...pipeline.stages[0],
            status: "passed",
            score: 78,
            completedAt: new Date().toISOString(),
          }
          pipeline.stages[1] = {
            ...pipeline.stages[1],
            status: "scheduled",
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }
          pipeline.overallProgress = 25
          pipeline.currentStage = 1
        } else {
          // Emily - just started
          pipeline.stages[0] = {
            ...pipeline.stages[0],
            status: "scheduled",
            scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          }
          pipeline.overallProgress = 0
          pipeline.currentStage = 0
        }

        pipelines.push(pipeline)
      }
    }

    // Save pipelines
    localStorage.setItem("interviewPipelines", JSON.stringify(pipelines))

    return {
      applications: sampleApplications,
      pipelines: pipelines,
    }
  }

  static clearDemoData() {
    localStorage.removeItem("candidateApplications")
    localStorage.removeItem("interviewPipelines")
  }
}
