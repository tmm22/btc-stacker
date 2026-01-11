"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [apiKeyId, setApiKeyId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("encryptedApiKey");
    if (saved) {
      setIsConnected(true);
    }
  }, []);

  const handleSave = async () => {
    if (!apiKeyId || !apiSecret) {
      setMessage({ type: "error", text: "Please enter both API Key ID and Secret" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          apiKeyId,
          apiSecret,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const errorMsg = result.details || result.error || "Failed to save API keys";
        throw new Error(errorMsg);
      }

      const fullEncryptedKey = `${result.encryptedApiKey}:${result.encryptedApiSecret}`;
      localStorage.setItem("encryptedApiKey", fullEncryptedKey);

      setIsConnected(true);
      setApiKeyId("");
      setApiSecret("");
      setMessage({ type: "success", text: "API keys validated and saved successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save API keys",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    const saved = localStorage.getItem("encryptedApiKey");
    if (!saved) {
      setMessage({ type: "error", text: "No API keys saved" });
      return;
    }

    setIsTesting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/bitaroo/balance", {
        headers: { "X-Encrypted-Api-Key": saved },
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Connection successful! API keys are valid." });
      } else {
        throw new Error("Connection failed");
      }
    } catch {
      setMessage({ type: "error", text: "Connection test failed. Please check your API keys." });
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem("encryptedApiKey");
    setIsConnected(false);
    setMessage({ type: "warning", text: "API keys removed" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Configure your Bitaroo API connection</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-900/50 border border-green-800 text-green-200"
              : message.type === "warning"
              ? "bg-yellow-900/50 border border-yellow-800 text-yellow-200"
              : "bg-red-900/50 border border-red-800 text-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : message.type === "warning" ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-500" />
            API Connection
          </CardTitle>
          <CardDescription>
            Connect your Bitaroo account to enable automated trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span>Connected to Bitaroo</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleTestConnection} variant="outline" disabled={isTesting}>
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
                <Button onClick={handleDisconnect} variant="destructive">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiKeyId">API Key ID</Label>
                <Input
                  id="apiKeyId"
                  type="text"
                  value={apiKeyId}
                  onChange={(e) => setApiKeyId(e.target.value)}
                  placeholder="Enter your API Key ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your API Secret"
                />
              </div>
              <Button onClick={handleSave} disabled={isLoading} className="w-full">
                {isLoading ? "Validating..." : "Save & Connect"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p>API keys are encrypted using AES-256-GCM before storage</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p>Keys are stored locally in your browser - never sent to external servers</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p>Only buy orders are executed - this app cannot sell or withdraw your Bitcoin</p>
          </div>
          <div className="rounded-lg bg-yellow-900/30 border border-yellow-800/50 p-4 mt-4">
            <h4 className="font-medium text-yellow-200 mb-2">Recommended API Permissions</h4>
            <p className="text-yellow-200/80">
              When creating your Bitaroo API key, only enable:
            </p>
            <ul className="list-disc list-inside mt-2 text-yellow-200/80">
              <li>View balances</li>
              <li>View orders</li>
              <li>Create orders (buy only if available)</li>
            </ul>
            <p className="mt-2 text-yellow-200/80">
              Do NOT enable withdrawal permissions for maximum security.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Get Your API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-400">
          <ol className="list-decimal list-inside space-y-2">
            <li>Log in to your Bitaroo account at trade.bitaroo.com.au</li>
            <li>Go to Account → API Keys</li>
            <li>Click "Generate New API Key"</li>
            <li>Set appropriate permissions (read + trade)</li>
            <li>Copy both the Key ID and Secret</li>
            <li>Paste them in the fields above</li>
          </ol>
          <p className="text-orange-500">
            Important: The API Secret is only shown once. Save it securely!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
