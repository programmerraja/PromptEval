import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [settings, setSettings] = useState<any>(null);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await db.settings.get('default');
    setSettings(data);
  };

  const saveSettings = async () => {
    if (settings) {
      await db.settings.put(settings);
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    }
  };

  const updateApiKey = (provider: 'openai' | 'anthropic' | 'google', value: string) => {
    setSettings({
      ...settings,
      api_keys: {
        ...settings?.api_keys,
        [provider]: value
      }
    });
  };

  if (!settings) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-muted-foreground">Configure your PromptEval workspace</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="dataset">Dataset Generator</TabsTrigger>
          <TabsTrigger value="evaluator">Evaluator</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Configure API keys for LLM providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type={showOpenAI ? "text" : "password"}
                    placeholder="sk-..."
                    value={settings.api_keys?.openai || ''}
                    onChange={(e) => updateApiKey('openai', e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowOpenAI(!showOpenAI)}
                  >
                    {showOpenAI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Anthropic API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type={showAnthropic ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={settings.api_keys?.anthropic || ''}
                    onChange={(e) => updateApiKey('anthropic', e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowAnthropic(!showAnthropic)}
                  >
                    {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Google API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type={showGoogle ? "text" : "password"}
                    placeholder="AIza..."
                    value={settings.api_keys?.google || ''}
                    onChange={(e) => updateApiKey('google', e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowGoogle(!showGoogle)}
                  >
                    {showGoogle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dataset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dataset Generator Config</CardTitle>
              <CardDescription>Configure model for behavior extraction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input 
                    value={settings.dataset_generator_config?.model || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        model: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.dataset_generator_config?.temperature || 0.5}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        temperature: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input 
                    type="number"
                    value={settings.dataset_generator_config?.max_tokens || 100}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        max_tokens: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Top P</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.dataset_generator_config?.top_p || 0.9}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        top_p: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluator Settings</CardTitle>
              <CardDescription>Default evaluation models and prompts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Evaluation Model</Label>
                  <Input 
                    value={settings.default_model?.model || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        model: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.default_model?.temperature || 0.5}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        temperature: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input 
                    type="number"
                    value={settings.default_model?.max_tokens || 100}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        max_tokens: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Top P</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.default_model?.top_p || 0.9}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        top_p: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Management</CardTitle>
              <CardDescription>Manage local storage and backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Local Storage Usage</Label>
                <p className="text-sm text-muted-foreground">Calculating...</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Export All Data</Button>
                <Button variant="outline">Import Data</Button>
                <Button variant="destructive">Clear All Data</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
