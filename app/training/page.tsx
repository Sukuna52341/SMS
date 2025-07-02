"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { BookOpen, CheckCircle, Clock, Award, Shield, AlertTriangle, FileText } from "lucide-react"
import Navbar from "@/components/navbar"

// Mock quiz questions for the "Handling Sensitive Customer Data" module
const mockQuizQuestions = [
  {
    id: "q1",
    question: "Which of the following is considered sensitive personal data?",
    options: [
      "Customer's favorite color",
      "Customer's email address",
      "Customer's social security number",
      "Customer's preferred contact time",
    ],
    correctAnswer: 2,
  },
  {
    id: "q2",
    question:
      "What should you do if you accidentally access a customer's sensitive data that you don't need for your job?",
    options: [
      "Continue working with the data since you already accessed it",
      "Log the accidental access and close the record immediately",
      "Share it with your colleague to get advice",
      "Delete the access logs to avoid problems",
    ],
    correctAnswer: 1,
  },
  {
    id: "q3",
    question: "How long should you keep customer data after it's no longer needed?",
    options: [
      "Indefinitely for record-keeping",
      "Only as long as required by law or business need",
      "At least 10 years",
      "Until the customer requests deletion",
    ],
    correctAnswer: 1,
  },
  {
    id: "q4",
    question: "What is the best practice when sharing customer data with another department?",
    options: [
      "Email the full customer record to the department",
      "Share only the minimum necessary data through secure channels",
      "Print the data and hand-deliver it",
      "Upload it to a public cloud storage for easy access",
    ],
    correctAnswer: 1,
  },
  {
    id: "q5",
    question: "What should you do if a customer requests to see all data you hold about them?",
    options: [
      "Ignore the request as it's too complicated",
      "Send them only the data you personally collected",
      "Follow the company's data subject access request procedure",
      "Ask them why they need the information first",
    ],
    correctAnswer: 2,
  },
]

export default function TrainingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeModule, setActiveModule] = useState<any>(null)
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [trainingModules, setTrainingModules] = useState<any[]>([])
  const [requiredModules, setRequiredModules] = useState<any[]>([])
  const [optionalModules, setOptionalModules] = useState<any[]>([])
  const [completedModules, setCompletedModules] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== "staff")) {
      router.push("/login")
    } else if (user) {
      fetchTrainingData()
    }
  }, [user, loading, router])

  const fetchTrainingData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/training", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-name": user?.name || "",
          "x-user-role": user?.role || "",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json()
      console.log("Training data received:", data);

      if (data.success) {
        setRequiredModules(data.data.required || []);
        setOptionalModules(data.data.optional || []);
        setCompletedModules(data.data.completed || []);
      } else {
        console.error("API returned success:false", data);
      }
    } catch (error) {
      console.error("Error fetching training data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartModule = async (module: any) => {
    setActiveModule(module)

    // Call API to update training status
    if (user) {
      try {
        const response = await fetch("/api/training", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-user-name": user.name,
            "x-user-role": user.role,
          },
          body: JSON.stringify({
            moduleId: module.id,
            action: "start",
          }),
        })
      } catch (error) {
        console.error("Error starting training module:", error)
      }
    }
  }

  const handleStartQuiz = () => {
    setIsQuizActive(true)
    setCurrentQuestionIndex(0)
    setSelectedAnswers({})
    setQuizCompleted(false)
    setQuizScore(0)
  }

  const handleSelectAnswer = (questionId: string, answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }))
  }

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < mockQuizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      // Calculate score
      let correctAnswers = 0
      Object.entries(selectedAnswers).forEach(([questionId, answerIndex]) => {
        const question = mockQuizQuestions.find((q) => q.id === questionId)
        if (question && question.correctAnswer === answerIndex) {
          correctAnswers++
        }
      })

      const score = Math.round((correctAnswers / mockQuizQuestions.length) * 100)
      setQuizScore(score)
      setQuizCompleted(true)

      // Call API to update quiz score
      if (user && activeModule) {
        try {
          const response = await fetch("/api/training", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.id,
              "x-user-name": user.name,
              "x-user-role": user.role,
            },
            body: JSON.stringify({
              moduleId: activeModule.id,
              action: "complete_quiz",
              quizScore: score,
            }),
          })
        } catch (error) {
          console.error("Error completing quiz:", error)
        }
      }
    }
  }

  const handleCompleteModule = async () => {
    if (!user || !activeModule) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-name": user.name,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          moduleId: activeModule.id,
          action: "complete",
          quizScore: quizScore,
        }),
      })

      // Refresh training data
      await fetchTrainingData()

      // Close the dialog
      setActiveModule(null)
      setIsQuizActive(false)
      setQuizCompleted(false)
    } catch (error) {
      console.error("Error completing training module:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // Calculate training progress
  const requiredTotal = requiredModules.length
  const requiredCompleted = requiredModules.filter((module) => module.status === "completed").length
  const requiredProgress = requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : 0

  const optionalTotal = optionalModules.length
  const optionalCompleted = optionalModules.filter((module) => module.status === "completed").length
  const optionalProgress = optionalTotal > 0 ? Math.round((optionalCompleted / optionalTotal) * 100) : 0

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold dark:text-white">Staff Training Portal</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Complete required training modules on data privacy and security
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Training Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium dark:text-white">Required Modules</span>
                    <span className="text-sm font-medium dark:text-white">
                      {requiredCompleted}/{requiredTotal} Complete
                    </span>
                  </div>
                  <Progress value={requiredProgress} className="h-2 mb-4" />

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium dark:text-white">Optional Modules</span>
                    <span className="text-sm font-medium dark:text-white">
                      {optionalCompleted}/{optionalTotal} Complete
                    </span>
                  </div>
                  <Progress value={optionalProgress} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requiredModules
                      .filter((module) => module.status !== "completed" && module.dueDate)
                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                      .slice(0, 2)
                      .map((module) => {
                        const dueDate = new Date(module.dueDate)
                        const today = new Date()
                        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                        return (
                          <div key={module.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock
                                className={`h-4 w-4 ${daysLeft <= 7 ? "text-red-500" : daysLeft <= 14 ? "text-yellow-500" : "text-green-500"}`}
                              />
                              <span className="text-sm font-medium dark:text-white">{module.title}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`${
                                daysLeft <= 7
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                  : daysLeft <= 14
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              }`}
                            >
                              {daysLeft} days left
                            </Badge>
                          </div>
                        )
                      })}

                    {requiredModules.filter((module) => module.status !== "completed" && module.dueDate).length === 0 && (
                      <div className="text-center py-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming deadlines</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {completedModules.length > 0 ? (
                    <div className="space-y-3">
                      {completedModules.slice(0, 3).map((module) => (
                        <div key={module.id} className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-sm font-medium dark:text-white">{module.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Completed: {new Date(module.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No certifications yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="required" className="space-y-6">
              <TabsList>
                <TabsTrigger value="required">Required Training</TabsTrigger>
                <TabsTrigger value="optional">Optional Training</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="required">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {requiredModules.map((module) => (
                    <Card key={module.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          {module.status === "completed" ? (
                            <Badge className="bg-green-500">Completed</Badge>
                          ) : module.status === "in_progress" ? (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            >
                              In Progress
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Started</Badge>
                          )}
                        </div>
                        <CardDescription>{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Duration:</span>
                            <span className="text-sm dark:text-white">{module.duration}</span>
                          </div>

                          {module.status !== "not_started" && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Progress:</span>
                                <span className="text-sm dark:text-white">{module.progress}%</span>
                              </div>
                              <Progress value={module.progress} className="h-2" />
                            </div>
                          )}

                          {module.dueDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Due Date:</span>
                              <span className="text-sm dark:text-white">
                                {new Date(module.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 border-t">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => handleStartModule(module)}
                        >
                          {module.status === "completed"
                            ? "Review"
                            : module.status === "in_progress"
                              ? "Continue"
                              : "Start"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}

                  {requiredModules.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium dark:text-white mb-1">No Required Modules</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        There are no required training modules assigned to you.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="optional">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {optionalModules.map((module) => (
                    <Card key={module.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <Badge variant="outline">Optional</Badge>
                        </div>
                        <CardDescription>{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Duration:</span>
                            <span className="text-sm dark:text-white">{module.duration}</span>
                          </div>

                          {module.status !== "not_started" && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Progress:</span>
                                <span className="text-sm dark:text-white">{module.progress}%</span>
                              </div>
                              <Progress value={module.progress} className="h-2" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 border-t">
                        <Button
                          variant={module.status === "completed" ? "default" : "outline"}
                          className={`w-full ${module.status === "completed" ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={() => handleStartModule(module)}
                        >
                          {module.status === "completed"
                            ? "Review"
                            : module.status === "in_progress"
                              ? "Continue"
                              : "Start"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}

                  {optionalModules.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium dark:text-white mb-1">No Optional Modules</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        There are no optional training modules available.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedModules.map((module) => (
                    <Card key={module.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <Badge className="bg-green-500">Completed</Badge>
                        </div>
                        <CardDescription>{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Completed:</span>
                            <span className="text-sm dark:text-white">
                              {new Date(module.completedAt).toLocaleDateString()}
                            </span>
                          </div>

                          {module.score !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Score:</span>
                              <span className="text-sm dark:text-white">{module.score}%</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Certificate:</span>
                            <Button variant="link" size="sm" className="h-auto p-0">
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 border-t">
                        <Button variant="outline" className="w-full" onClick={() => handleStartModule(module)}>
                          Review
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}

                  {completedModules.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium dark:text-white mb-1">No Completed Modules</h3>
                      <p className="text-gray-500 dark:text-gray-400">You haven't completed any training modules yet.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Training Module Dialog */}
        <Dialog open={!!activeModule} onOpenChange={(open) => !open && setActiveModule(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {activeModule && !isQuizActive && (
              <>
                <DialogHeader>
                  <DialogTitle>{activeModule.title}</DialogTitle>
                  <DialogDescription>{activeModule.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-400">Why This Training Matters</p>
                      <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                        Protecting customer data is not just a legal requirement but also builds trust. This training will
                        help you understand how to handle sensitive information properly and comply with data protection
                        regulations.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium dark:text-white">Module Content</h3>

                    <div className="border rounded-md">
                      <div className="p-4 border-b">
                        <h4 className="font-medium dark:text-white">1. Understanding Sensitive Data</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Learn what constitutes sensitive customer information and why it needs special protection.
                        </p>
                      </div>

                      <div className="p-4 border-b">
                        <h4 className="font-medium dark:text-white">2. Legal and Regulatory Requirements</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Overview of relevant data protection laws and regulations that apply to microfinance
                          institutions.
                        </p>
                      </div>

                      <div className="p-4 border-b">
                        <h4 className="font-medium dark:text-white">3. Secure Data Handling Practices</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Best practices for accessing, storing, and transmitting sensitive customer data.
                        </p>
                      </div>

                      <div className="p-4 border-b">
                        <h4 className="font-medium dark:text-white">4. Responding to Data Requests</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          How to properly handle customer requests for data access, correction, or deletion.
                        </p>
                      </div>

                      <div className="p-4">
                        <h4 className="font-medium dark:text-white">5. Data Breach Prevention</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          How to identify and prevent potential data breaches and security incidents.
                        </p>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-400">Important Note</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                          You must complete the quiz at the end of this module to receive credit. A score of 80% or higher
                          is required to pass.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium dark:text-white mb-2">Training Materials</h3>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm dark:text-white">Sensitive Data Handling Guide.pdf</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm dark:text-white">Data Privacy Checklist.pdf</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm dark:text-white">Customer Data Request Procedures.pdf</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setActiveModule(null)}>
                    Close
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleStartQuiz}>
                    Take Quiz
                  </Button>
                </DialogFooter>
              </>
            )}

            {activeModule && isQuizActive && !quizCompleted && (
              <>
                <DialogHeader>
                  <DialogTitle>Quiz: {activeModule.title}</DialogTitle>
                  <DialogDescription>
                    Question {currentQuestionIndex + 1} of {mockQuizQuestions.length}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <div className="mb-6">
                    <Progress value={((currentQuestionIndex + 1) / mockQuizQuestions.length) * 100} className="h-2" />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium dark:text-white">
                      {mockQuizQuestions[currentQuestionIndex].question}
                    </h3>

                    <RadioGroup
                      value={selectedAnswers[mockQuizQuestions[currentQuestionIndex].id]?.toString()}
                      onValueChange={(value) =>
                        handleSelectAnswer(mockQuizQuestions[currentQuestionIndex].id, Number.parseInt(value))
                      }
                      className="space-y-3"
                    >
                      {mockQuizQuestions[currentQuestionIndex].options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2 border p-3 rounded-md">
                          <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleNextQuestion}
                    disabled={selectedAnswers[mockQuizQuestions[currentQuestionIndex].id] === undefined}
                  >
                    {currentQuestionIndex < mockQuizQuestions.length - 1 ? "Next Question" : "Submit Quiz"}
                  </Button>
                </DialogFooter>
              </>
            )}

            {activeModule && isQuizActive && quizCompleted && (
              <>
                <DialogHeader>
                  <DialogTitle>Quiz Results: {activeModule.title}</DialogTitle>
                  <DialogDescription>You have completed the quiz</DialogDescription>
                </DialogHeader>

                <div className="py-4 text-center">
                  <div className="mb-6">
                    {quizScore >= 80 ? (
                      <div className="flex flex-col items-center">
                        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mb-4">
                          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Congratulations!</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          You passed the quiz with a score of {quizScore}%
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-3 mb-4">
                          <AlertTriangle className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Almost There</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          You scored {quizScore}%. You need 80% to pass.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-md p-4 max-w-md mx-auto mb-6">
                    <h4 className="font-medium dark:text-white mb-2">Quiz Summary</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Questions:</span>
                      <span className="font-medium dark:text-white">{mockQuizQuestions.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Correct Answers:</span>
                      <span className="font-medium dark:text-white">
                        {Math.round((quizScore / 100) * mockQuizQuestions.length)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Score:</span>
                      <span className="font-medium dark:text-white">{quizScore}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Result:</span>
                      <span
                        className={`font-medium ${quizScore >= 80 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}
                      >
                        {quizScore >= 80 ? "Pass" : "Retry Needed"}
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  {quizScore >= 80 ? (
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleCompleteModule}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin mr-2">⟳</span>
                          Completing...
                        </>
                      ) : (
                        "Complete Module"
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => {
                        setIsQuizActive(false)
                        setQuizCompleted(false)
                      }}
                    >
                      Review Material & Try Again
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
