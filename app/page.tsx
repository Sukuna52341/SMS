import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Lock, FileText, Users, Database } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-500 to-teal-500 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Secure Customer Data Management System</h1>
            <p className="text-xl mb-8">
              Protecting sensitive customer information with enterprise-grade security for microfinance institutions
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  Login
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="bg-white/10 text-white border-white hover:bg-white/20">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">Key Security Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Database className="h-10 w-10 text-green-500" />}
              title="Encrypted Database"
              description="AES-256 encryption for all sensitive customer data stored in MySQL database"
            />
            <FeatureCard
              icon={<Lock className="h-10 w-10 text-green-500" />}
              title="Access Control"
              description="Role-based access control ensuring only authorized personnel can access sensitive information"
            />
            <FeatureCard
              icon={<FileText className="h-10 w-10 text-green-500" />}
              title="Audit Logging"
              description="Comprehensive audit trails for all data access and modifications"
            />
            <FeatureCard
              icon={<Users className="h-10 w-10 text-green-500" />}
              title="Privacy Management"
              description="Self-service portal for customers to manage their data privacy rights"
            />
            <FeatureCard
              icon={<Shield className="h-10 w-10 text-green-500" />}
              title="Staff Training"
              description="Interactive training modules on data protection and privacy regulations"
            />
            <FeatureCard
              icon={<Lock className="h-10 w-10 text-green-500" />}
              title="Compliance Ready"
              description="Built to help meet regulatory requirements for financial data protection"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 dark:text-white">Ready to secure your customer data?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto dark:text-gray-300">
            Our system provides enterprise-grade security with an easy-to-use interface, helping microfinance
            institutions protect sensitive customer information.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-green-500 hover:bg-green-600">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}
