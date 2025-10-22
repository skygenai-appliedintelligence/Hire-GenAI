"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestOtpEmailPage() {
  const [signupData, setSignupData] = useState({
    email: "",
    fullName: "",
    companyName: "",
  });
  const [loginData, setLoginData] = useState({
    email: "",
    demo: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSignupTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    console.log("🧪 Testing Signup OTP with data:", signupData);

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(signupData),
      });

      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log("📋 Response data:", data);
      setResult(data);
    } catch (error) {
      console.error("❌ Network error:", error);
      setResult({ error: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    console.log("🧪 Testing Login OTP with data:", loginData);

    try {
      const response = await fetch("/api/otp/send-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(loginData),
      });

      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log("📋 Response data:", data);
      setResult(data);
    } catch (error) {
      console.error("❌ Network error:", error);
      setResult({ error: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test OTP Email Functionality</CardTitle>
          <CardDescription>
            Test the OTP email sending for both signup and login flows. Make sure your SMTP configuration is set up correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Signup OTP</TabsTrigger>
              <TabsTrigger value="login">Login OTP</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignupTest} className="space-y-4">
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    placeholder="test@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={signupData.fullName}
                    onChange={handleSignupChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium mb-1">
                    Company Name (Optional)
                  </label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={signupData.companyName}
                    onChange={handleSignupChange}
                    placeholder="Acme Corp"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send Signup OTP"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLoginTest} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="test@example.com"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="demo"
                    name="demo"
                    type="checkbox"
                    checked={loginData.demo}
                    onChange={(e) => setLoginData(prev => ({ ...prev, demo: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="demo" className="text-sm font-medium">
                    Demo Mode
                  </label>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send Login OTP"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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
        <h3 className="font-medium mb-2">How it works:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Signup OTP:</strong> Creates new user verification code and sends welcome email</li>
          <li><strong>Login OTP:</strong> Sends sign-in verification code for existing users</li>
          <li><strong>Demo Mode:</strong> Special demo access with sample data</li>
          <li><strong>Fallback:</strong> If email fails, OTP will be logged to console</li>
          <li><strong>Development:</strong> OTP codes are included in API response for testing</li>
        </ul>
        
        <h3 className="font-medium mb-2 mt-4">Check your email inbox for:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Professional HTML email with verification code</li>
          <li>Clear instructions and security notes</li>
          <li>10-minute expiration time</li>
        </ul>
      </div>
    </div>
  );
}
