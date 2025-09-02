import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText, GitBranch, Bot, Shield, Users, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">DocPro</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Document Management for
            <span className="text-primary block">Public Safety</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Keep using Word or Google Docs while gaining enterprise-grade version control, 
            AI-powered search, and structured approval workflows that reduce liability 
            and enhance officer safety.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Why Public Safety Chooses DocPro</h3>
            <p className="text-xl text-muted-foreground">
              Built specifically for the unique needs of law enforcement, fire departments, and emergency services
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="mb-4">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Multi-Format Support</h4>
              <p className="text-muted-foreground">
                Keep using your preferred tools. DocPro seamlessly works with Word, Google Docs, 
                and PDFs while providing unified version control.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">AI-Powered Search</h4>
              <p className="text-muted-foreground">
                Find procedures instantly with natural language queries. 
                "What's our pursuit policy?" gets immediate, accurate answers.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <GitBranch className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Structured Approvals</h4>
              <p className="text-muted-foreground">
                Streamlined review processes ensure policy changes go through 
                proper channels with complete audit trails.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Liability Protection</h4>
              <p className="text-muted-foreground">
                Complete audit trails and version control provide legal protection 
                and reduce liability exposure from outdated policies.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Real-Time Collaboration</h4>
              <p className="text-muted-foreground">
                Multiple team members can work on policies simultaneously, 
                regardless of their preferred editing tools.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Instant Access</h4>
              <p className="text-muted-foreground">
                Officers get immediate access to current policies on any device, 
                with confidence that information is always up-to-date.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Document Management?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join forward-thinking departments already using DocPro
          </p>
          <Link href="/register">
            <Button size="lg">
              Start Your Free Trial Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 DocPro. Built for public safety organizations.</p>
        </div>
      </footer>
    </div>
  )
}
