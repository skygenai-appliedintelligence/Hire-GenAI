# Email Integration Examples

## 1. Contact Form Integration

### Simple Contact Form (using /api/send-contact)
```typescript
const handleContactSubmit = async (formData: {
  name: string;
  email: string;
  message: string;
}) => {
  try {
    const response = await fetch("/api/send-contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await response.json();
    if (result.ok) {
      console.log("Email sent successfully:", result.id);
    }
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};
```

### Enhanced Contact Form (using /api/emails/send)
```typescript
const handleContactSubmit = async (formData: {
  name: string;
  email: string;
  message: string;
}) => {
  try {
    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "contact",
        name: formData.name,
        email: formData.email,
        message: formData.message,
        // to: "custom@email.com" // Optional: override default recipient
      }),
    });

    const result = await response.json();
    if (result.ok) {
      console.log("Contact email sent:", result.messageId);
    }
  } catch (error) {
    console.error("Failed to send contact email:", error);
  }
};
```

## 2. Application Confirmation Email

### After Candidate Applies for Job
```typescript
const sendApplicationConfirmation = async (applicationData: {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
}) => {
  try {
    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "application",
        candidateName: applicationData.candidateName,
        candidateEmail: applicationData.candidateEmail,
        jobTitle: applicationData.jobTitle,
        companyName: applicationData.companyName,
      }),
    });

    const result = await response.json();
    if (result.ok) {
      console.log("Application confirmation sent:", result.messageId);
    }
  } catch (error) {
    console.error("Failed to send application confirmation:", error);
  }
};

// Usage in your application submission handler
const handleJobApplication = async (applicationData: any) => {
  // ... save application to database
  
  // Send confirmation email
  await sendApplicationConfirmation({
    candidateName: applicationData.fullName,
    candidateEmail: applicationData.email,
    jobTitle: job.title,
    companyName: company.name,
  });
};
```

## 3. Interview Invitation Email

### When Scheduling an Interview
```typescript
const sendInterviewInvitation = async (interviewData: {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewDate: string;
  interviewTime: string;
  interviewLink: string;
  companyName: string;
}) => {
  try {
    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "interview",
        ...interviewData,
      }),
    });

    const result = await response.json();
    if (result.ok) {
      console.log("Interview invitation sent:", result.messageId);
    }
  } catch (error) {
    console.error("Failed to send interview invitation:", error);
  }
};

// Usage in your interview scheduling handler
const scheduleInterview = async (candidateId: string, interviewDetails: any) => {
  // ... save interview to database
  
  // Send invitation email
  await sendInterviewInvitation({
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    jobTitle: job.title,
    interviewDate: "Monday, December 25, 2024",
    interviewTime: "2:00 PM - 3:00 PM (UTC)",
    interviewLink: "https://meet.google.com/abc-defg-hij",
    companyName: company.name,
  });
};
```

## 4. Integration with Existing Database Service

### Add to your DatabaseService class
```typescript
// In lib/database.ts
export class DatabaseService {
  // ... existing methods

  static async createApplicationWithEmail(applicationData: any) {
    try {
      // Create application in database
      const application = await this.createApplication(applicationData);
      
      // Send confirmation email
      const emailResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/emails/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "application",
          candidateName: applicationData.fullName,
          candidateEmail: applicationData.email,
          jobTitle: applicationData.jobTitle,
          companyName: applicationData.companyName,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send application confirmation email");
      }

      return application;
    } catch (error) {
      console.error("Error creating application with email:", error);
      throw error;
    }
  }

  static async scheduleInterviewWithEmail(interviewData: any) {
    try {
      // Create interview in database
      const interview = await this.createInterview(interviewData);
      
      // Send invitation email
      const emailResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/emails/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "interview",
          candidateName: interviewData.candidateName,
          candidateEmail: interviewData.candidateEmail,
          jobTitle: interviewData.jobTitle,
          interviewDate: interviewData.interviewDate,
          interviewTime: interviewData.interviewTime,
          interviewLink: interviewData.interviewLink,
          companyName: interviewData.companyName,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send interview invitation email");
      }

      return interview;
    } catch (error) {
      console.error("Error scheduling interview with email:", error);
      throw error;
    }
  }
}
```

## 5. Frontend React Hook for Email Sending

### Custom Hook
```typescript
// hooks/useEmailSender.ts
import { useState } from 'react';

export const useEmailSender = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async (emailData: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sendEmail, loading, error };
};
```

### Usage in Component
```typescript
import { useEmailSender } from '@/hooks/useEmailSender';

export default function ContactForm() {
  const { sendEmail, loading, error } = useEmailSender();

  const handleSubmit = async (formData: any) => {
    try {
      await sendEmail({
        type: "contact",
        name: formData.name,
        email: formData.email,
        message: formData.message,
      });
      
      // Show success message
      toast.success("Message sent successfully!");
    } catch (error) {
      // Show error message
      toast.error("Failed to send message. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send Message"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
```

## 6. Environment Variables Setup

Add these to your `.env.local` file:

```env
# Hostinger SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=yourStrongPassword
EMAIL_FROM="HireGenAI <no-reply@yourdomain.com>"
EMAIL_TO=support@yourdomain.com

# For internal API calls (if needed)
NEXTAUTH_URL=http://localhost:3000
```

## 7. Testing the Implementation

Visit `/test-email` in your browser to test the email functionality with a simple form interface.

## 8. Production Considerations

1. **Rate Limiting**: Consider adding rate limiting to prevent spam
2. **Email Queue**: For high volume, consider using a queue system
3. **Error Handling**: Implement proper error logging and monitoring
4. **Templates**: Store email templates in a database for easy editing
5. **Unsubscribe**: Add unsubscribe links for marketing emails
6. **Analytics**: Track email delivery and open rates
