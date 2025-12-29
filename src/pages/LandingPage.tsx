import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Database, MessageSquare, Zap, CheckCircle2, Sliders, PlayCircle, Shield, Lock, HardDrive } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <span>PromptEval</span>
                </div>
                <nav className="hidden md:flex items-center gap-6">
                    <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</a>
                    <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">How it Works</a>
                </nav>
                <div className="flex items-center gap-4">
                    <Link to="/dashboard">
                        <Button>Get Started</Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-24 px-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-40"></div>
                    <div className="max-w-4xl mx-auto space-y-8">
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                            Master Your Prompts
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            The ultimate platform for AI engineers to evaluate, optimize, and version control LLM prompts.
                            Turn prompt engineering from an art into a measurable science.
                        </p>
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <Link to="/dashboard">
                                <Button size="lg" className="h-12 px-8 text-lg gap-2">
                                    Launch Dashboard <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                                View Documentation
                            </Button>
                        </div>

                        {/* Dashboard Preview */}
                        <div className="mt-16 relative mx-auto max-w-5xl rounded-xl border border-border/50 bg-card/50 shadow-2xl p-2 backdrop-blur-sm">
                            <img
                                src="/dashboard.png"
                                alt="PromptEval Dashboard Preview"
                                className="rounded-lg border border-border/20 w-full h-auto shadow-sm"
                            />
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="py-24 px-6 bg-muted/30">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-16">Everything you need to build better prompts</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<Zap className="h-8 w-8 text-amber-500" />}
                                title="Rapid Testing"
                                description="Test prompts against multiple models (OpenAI, Anthropic, Gemini) instantly. Compare outputs side-by-side to find the winner."
                            />
                            <FeatureCard
                                icon={<Database className="h-8 w-8 text-blue-500" />}
                                title="Dataset Management"
                                description="Curate test cases and manage datasets to ensure your prompts handle edge cases gracefully. Import and export data with ease."
                            />
                            <FeatureCard
                                icon={<MessageSquare className="h-8 w-8 text-green-500" />}
                                title="Multi-Model Chat"
                                description="Interactive playground to chat with various LLMs simultaneously. Simulate user-assistant conversations to verify multi-turn logic."
                            />
                        </div>
                    </div>
                </section>

                {/* How it Works Section */}
                <section id="how-it-works" className="py-24 px-6">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-16">How PromptEval Works</h2>

                        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                            <div className="space-y-6">
                                <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">1</div>
                                <h3 className="text-2xl font-bold">Create & Version Your Prompts</h3>
                                <p className="text-lg text-muted-foreground">
                                    Start by creating a prompt in our editor. Use variable placeholders like <code>{`{{input}}`}</code>.
                                    Every change you make is versioned, so you can always roll back or compare performance across versions.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Automatic version control
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Support for System & User prompts
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Built-in variable management
                                    </li>
                                </ul>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/30 h-[300px] flex items-center justify-center relative overflow-hidden group">
                                <img src="/prompt.png" alt="" />
                                {/* <Sliders className="h-24 w-24 text-muted-foreground/30 transition-transform group-hover:scale-110 duration-500" >
                                </Sliders> */}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                            <div className="rounded-xl border border-border bg-muted/30 h-[300px] flex items-center justify-center relative overflow-hidden group order-2 md:order-1">
                                <img src="/dataset.png" alt="" />
                                {/* <Database className="h-24 w-24 text-muted-foreground/30 transition-transform group-hover:scale-110 duration-500" /> */}
                            </div>
                            <div className="space-y-6 order-1 md:order-2">
                                <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">2</div>
                                <h3 className="text-2xl font-bold">Build Evaluation Datasets</h3>
                                <p className="text-lg text-muted-foreground">
                                    Define what "good" looks like. Create datasets of inputs and expected outputs.
                                    Use our Auto-Extraction tool to generate test cases from existing conversation logs automatically.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Easy JSON/CSV import
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Auto-generate datasets using AI
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Tag & organize test cases
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">3</div>
                                <h3 className="text-2xl font-bold">Run Evaluations & Analyze</h3>
                                <p className="text-lg text-muted-foreground">
                                    Execute your prompt against your dataset. Use LLM-as-a-Judge to automatically score responses based on criteria like
                                    helpfulness, accuracy, and tone. Visualize results and pick the best performing version.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Automated scoring with custom criteria
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Side-by-side comparison
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> Detailed latency & cost metrics
                                    </li>
                                </ul>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/30 h-[300px] flex items-center justify-center relative overflow-hidden group">
                                <img src="/eval.png" alt="" />
                                {/* <PlayCircle className="h-24 w-24 text-muted-foreground/30 transition-transform group-hover:scale-110 duration-500" /> */}
                            </div>
                        </div>

                    </div>
                </section>

                {/* Privacy Section */}
                <section className="py-24 px-6 relative overflow-hidden bg-muted/20">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <div className="flex justify-center mb-6">
                            <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                                <Shield className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <h2 className="text-4xl font-bold tracking-tight">Your Data Stays With You</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            PromptEval is built with a <strong>Local-First</strong> architecture. All your prompts, datasets, and API keys are stored securely in your browser's local storage (IndexedDB).
                        </p>
                        <div className="grid md:grid-cols-3 gap-8 pt-8">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center">
                                    <HardDrive className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold">Local Storage</h3>
                                <p className="text-sm text-muted-foreground">Nothing is ever saved to a cloud database.</p>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center">
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold">Secure API Keys</h3>
                                <p className="text-sm text-muted-foreground">Keys are stored locally and only used for requests.</p>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center">
                                    <Database className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold">Full Ownership</h3>
                                <p className="text-sm text-muted-foreground">Export and import your entire workspace anytime.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-border">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2 font-bold text-lg text-muted-foreground">
                        <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <span>PromptEval</span>
                    </div>
                    <div className="flex gap-8 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                        <a href="#" className="hover:text-primary transition-colors">GitHub</a>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} PromptEval. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all hover:bg-card">
            <div className="mb-4 p-3 rounded-lg bg-background w-fit border border-border/50">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}
