import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Sparkles, User, Bot } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card } from './ui/card'
import { blink } from '../blink/client'
import { useToast } from '../hooks/use-toast'

interface User {
  id: string
  email: string
  displayName?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: File[]
}

interface ChatInterfaceProps {
  user: User
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Welcome to StoryMode AI! 🎓 I'm here to help you craft a compelling narrative for your college applications.

To get started, I'll need to learn about you. Please share:

📚 **Intended Major** - What field do you want to study?
🏫 **Target Colleges** - Which schools are you applying to?
📝 **Essay Prompt** - What specific prompt are you working on?
🏅 **Extracurriculars** - Your activities, leadership roles, volunteering
📖 **Classes** - Relevant coursework that showcases your interests
🎨 **Hobbies** - Personal interests and passions
🏆 **Awards** - Recognition and achievements

You can share this information in any order, and feel free to attach documents like transcripts, activity lists, or draft essays. I'll help you weave these elements into a cohesive narrative that showcases your unique story!`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files])
      toast({
        title: "Files attached",
        description: `${files.length} file(s) ready to upload`
      })
    }
  }

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && attachedFiles.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    try {
      // Process attachments if any
      let attachmentContext = ''
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          try {
            const extractedText = await blink.data.extractFromBlob(file)
            attachmentContext += `\n\nContent from ${file.name}:\n${extractedText}`
          } catch (error) {
            console.error(`Error processing ${file.name}:`, error)
            attachmentContext += `\n\nNote: Could not process ${file.name}`
          }
        }
      }

      const fullPrompt = `${input}${attachmentContext}

Context: You are StoryMode AI, helping a college applicant create compelling narratives. The user is ${user.email}. 

Your role is to:
1. Guide them to provide the required information (Major, Colleges, Essay prompts, Extracurriculars, Classes, Hobbies, Awards)
2. Analyze their profile holistically 
3. Generate brainstorming ideas that connect their experiences
4. Provide strategic guidance for specific colleges and essay prompts
5. Help them showcase their passion and academic interests

Be encouraging, insightful, and specific in your responses. Help them see connections between their different experiences and how they tell a cohesive story.`

      let assistantResponse = ''
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      await blink.ai.streamText(
        { 
          prompt: fullPrompt,
          model: 'gpt-4o-mini',
          maxTokens: 1000
        },
        (chunk) => {
          assistantResponse += chunk
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: assistantResponse }
                : msg
            )
          )
        }
      )

    } catch (error) {
      console.error('Error generating response:', error)
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">StoryMode AI</h1>
              <p className="text-sm text-muted-foreground">College Application Narrative Assistant</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Welcome, {user.displayName || user.email}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' ? 'bg-primary ml-3' : 'bg-accent mr-3'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-accent-foreground" />
                )}
              </div>
              <Card className={`p-4 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-primary-foreground/20">
                    <div className="text-xs opacity-75 mb-2">Attachments:</div>
                    {message.attachments.map((file, index) => (
                      <div key={index} className="text-xs opacity-75">
                        📎 {file.name}
                      </div>
                    ))}
                  </div>
                )}
                <div className={`text-xs mt-2 opacity-60`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </Card>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <Bot className="w-4 h-4 text-accent-foreground" />
              </div>
              <Card className="p-4 bg-card">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </Card>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-card px-6 py-4">
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 bg-secondary px-3 py-1 rounded-full text-sm">
                <Paperclip className="w-3 h-3" />
                <span>{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share your major, target colleges, essay prompts, activities, or ask for guidance..."
              className="min-h-[60px] pr-12 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          <Button type="submit" disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileAttach}
          accept=".pdf,.doc,.docx,.txt,.rtf"
        />
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line. Attach documents to help me understand your profile better.
        </p>
      </div>
    </div>
  )
}