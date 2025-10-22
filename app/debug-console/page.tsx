"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugConsolePage() {
  const [email, setEmail] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const testSmtp = async () => {
    addLog("🧪 Starting SMTP test...");
    
    try {
      const response = await fetch("/api/test-smtp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      addLog(`📡 Response status: ${response.status}`);
      const data = await response.json();
      addLog(`📋 Response: ${JSON.stringify(data, null, 2)}`);
      
      if (data.success) {
        addLog("✅ SMTP test successful! Check your email.");
      } else {
        addLog(`❌ SMTP test failed: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Network error: ${error.message}`);
    }
  };

  const testOtp = async () => {
    addLog("🧪 Starting OTP test...");
    
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          fullName: "Test User",
          companyName: "Test Company"
        }),
      });

      addLog(`📡 OTP Response status: ${response.status}`);
      const data = await response.json();
      addLog(`📋 OTP Response: ${JSON.stringify(data, null, 2)}`);
      
      if (data.ok) {
        addLog("✅ OTP API call successful! Check server console for email logs.");
        if (data.otp) {
          addLog(`🔢 Development OTP: ${data.otp}`);
        }
      } else {
        addLog(`❌ OTP test failed: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ OTP Network error: ${error.message}`);
    }
  };

  const checkEnv = async () => {
    addLog("🔧 Checking environment variables...");
    
    try {
      const response = await fetch("/api/debug-email");
      const data = await response.json();
      addLog(`📋 Environment check: ${JSON.stringify(data.env, null, 2)}`);
    } catch (error: any) {
      addLog(`❌ Env check error: ${error.message}`);
    }
  };

  const forceEmailTest = async () => {
    addLog("🚀 Starting FORCE email test (bypasses OTP)...");
    
    try {
      const response = await fetch("/api/force-email-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      addLog(`📡 Force email status: ${response.status}`);
      const data = await response.json();
      addLog(`📋 Force email response: ${JSON.stringify(data, null, 2)}`);
      
      if (data.success) {
        addLog("✅ FORCE EMAIL SUCCESS! Check your inbox.");
      } else {
        addLog(`❌ Force email failed: ${data.error}`);
        addLog(`🔍 Error code: ${data.code}`);
      }
    } catch (error: any) {
      addLog(`❌ Force email network error: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Console - Email & OTP Testing</CardTitle>
          <CardDescription>
            This page shows both browser console logs and helps debug email issues.
            <br />
            <strong>Important:</strong> Also check your terminal/server console for detailed SMTP logs!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Test Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              required
            />
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={checkEnv} variant="outline">
              🔧 Check Environment
            </Button>
            <Button onClick={testSmtp} disabled={!email} variant="outline">
              🧪 Test SMTP Connection
            </Button>
            <Button onClick={forceEmailTest} disabled={!email} className="bg-red-600 hover:bg-red-700">
              🚀 FORCE Email Test
            </Button>
            <Button onClick={testOtp} disabled={!email}>
              📧 Test OTP Email
            </Button>
          </div>
          
          <div className="flex justify-center">
            <Button onClick={clearLogs} variant="secondary">
              🗑️ Clear Logs
            </Button>
          </div>

          {/* Browser Console Logs */}
          <div>
            <h3 className="font-medium mb-2">Browser Console Logs:</h3>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Click a test button above.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">How to Check Server Console:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>Look at your terminal where you ran <code>npm run dev</code></li>
              <li>After clicking test buttons, you should see detailed logs there</li>
              <li>Look for messages like:</li>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code>📧 sendMail called with:</code></li>
                <li><code>🔧 SMTP Configuration:</code></li>
                <li><code>✅ Email sent successfully:</code></li>
                <li><code>❌ Failed to send email:</code></li>
              </ul>
            </ol>
          </div>

          {/* Browser Console Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">Browser Console (F12):</h3>
            <p className="text-sm text-yellow-700">
              Press <kbd>F12</kbd> or <kbd>Ctrl+Shift+I</kbd> → Go to <strong>Console</strong> tab → 
              You should see the same logs as above plus any JavaScript errors.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
