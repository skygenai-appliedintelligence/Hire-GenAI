"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestEmailPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [smtpTestEmail, setSmtpTestEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/send-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSmtpTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    console.log("🧪 Testing SMTP with email:", smtpTestEmail);

    try {
      const response = await fetch("/api/test-smtp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: smtpTestEmail }),
      });

      console.log("📡 SMTP Response status:", response.status);
      const data = await response.json();
      console.log("📋 SMTP Response data:", data);
      setResult(data);
    } catch (error) {
      console.error("❌ SMTP Network error:", error);
      setResult({ error: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Email Functionality</CardTitle>
          <CardDescription>
            Test the Hostinger SMTP email sending feature. Make sure to configure your environment variables first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* SMTP Test Section */}
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-3">🧪 SMTP Connection Test</h3>
            <p className="text-sm text-yellow-700 mb-4">
              First test if SMTP is working at all. This will help identify if the issue is with SMTP configuration or OTP integration.
            </p>
            <form onSubmit={handleSmtpTest} className="flex gap-2">
              <Input
                type="email"
                value={smtpTestEmail}
                onChange={(e) => setSmtpTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                className="flex-1"
              />
              <Button type="submit" disabled={loading} variant="outline">
                {loading ? "Testing..." : "Test SMTP"}
              </Button>
            </form>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your message..."
                rows={4}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send Test Email"}
            </Button>
          </form>

          {result && (
            <div className="mt-6 p-4 rounded-lg border">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Environment Variables Required:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>SMTP_HOST=smtp.hostinger.com</li>
          <li>SMTP_PORT=465</li>
          <li>SMTP_USER=no-reply@yourdomain.com</li>
          <li>SMTP_PASS=yourStrongPassword</li>
          <li>EMAIL_FROM="Your Brand &lt;no-reply@yourdomain.com&gt;"</li>
          <li>EMAIL_TO=support@yourdomain.com</li>
        </ul>
      </div>
    </div>
  );
}
