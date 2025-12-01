"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, CheckCircle2, X, Briefcase, AlertCircle } from "lucide-react"

type QuestionElaborationState = {
  question: string
  combinedText: string
  prompts: number
}

const normalizeText = (text: string) => text.trim()
const countWords = (text: string) => normalizeText(text).split(/\s+/).filter(Boolean).length

export default function InterviewPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = (params?.applicationId as string) || ""
  const userVideoRef = useRef<HTMLVideoElement | null>(null)
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentReady, setAgentReady] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [jobDetails, setJobDetails] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [interviewPhase, setInterviewPhase] = useState<'setup' | 'greeting' | 'questions' | 'candidate_questions' | 'closing'>('setup')
  const [interviewStartTime, setInterviewStartTime] = useState<number | null>(null)
  const [interviewDuration, setInterviewDuration] = useState(30) // minutes
  const [showInstructions, setShowInstructions] = useState(true)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const agentTextBufferRef = useRef<string>("")
  const userTextBufferRef = useRef<string>("")
  const avatarFirstPlayRef = useRef<boolean>(true)
  const questionCountRef = useRef<number>(0)
  const lastAnalyzedAnswerRef = useRef<string>('')
  const isAnalyzingRef = useRef<boolean>(false)
  const lastQuestionAskedRef = useRef<string>('')
  const currentCriterionRef = useRef<string>('')
  const questionElaborationRef = useRef<QuestionElaborationState | null>(null)
  const [realTimeEvaluations, setRealTimeEvaluations] = useState<any[]>([])
  const realTimeEvaluationsRef = useRef<any[]>([]) // Ref to avoid stale closure
  const companyIdRef = useRef<string | null>(null) // Ref to avoid stale closure with state
  const currentQuestionNumberRef = useRef<number>(1)

  // Real-time answer evaluation function - calls OpenAI with company's service key
  const evaluateAnswer = async (question: string, answer: string, criterion: string) => {
    if (isAnalyzingRef.current) return null
    if (answer === lastAnalyzedAnswerRef.current) return null
    if (answer.trim().length < 10) return null // Skip very short utterances
    
    // Skip if no company ID available (use ref to avoid stale closure)
    if (!companyIdRef.current) {
      console.warn('⚠️ [REAL-TIME EVAL] No company ID available - skipping evaluation')
      console.warn('   companyIdRef.current:', companyIdRef.current)
      return null
    }
    
    isAnalyzingRef.current = true
    lastAnalyzedAnswerRef.current = answer
    
    try {
      console.log('🎯 [REAL-TIME EVAL] Sending answer for OpenAI evaluation...')
      console.log('📝 Question:', question.substring(0, 80))
      console.log('💬 Answer length:', answer.length)
      console.log('🎯 Criterion:', criterion)
      
      const response = await fetch('/api/interview/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer,
          criterion: criterion || 'General',
          questionNumber: currentQuestionNumberRef.current,
          totalQuestions: interviewQuestions.length || 10,
          jobTitle: jobDetails?.jobTitle,
          companyName: jobDetails?.company,
          companyId: companyIdRef.current, // Use ref instead of state
          applicationId: applicationId
        })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.ok) {
        console.error('❌ [REAL-TIME EVAL] API error:', result.error || 'Unknown error')
        console.error('💡 [REAL-TIME EVAL] Message:', result.message)
        return null
      }
      
      console.log('✅ [REAL-TIME EVAL] Evaluation received:')
      console.log('📊 Score:', result.evaluation?.score)
      console.log('📋 Completeness:', result.evaluation?.completeness)
      console.log('🎯 Matches Question:', result.evaluation?.matches_question)
      
      // Store the evaluation for later use
      if (result.evaluation) {
        // Update both state and ref to avoid stale closure issues
        const newEval = result.evaluation
        
        // Update ref immediately (sync)
        const existingIdx = realTimeEvaluationsRef.current.findIndex(e => e.question_text === question)
        if (existingIdx >= 0) {
          realTimeEvaluationsRef.current[existingIdx] = newEval
        } else {
          realTimeEvaluationsRef.current.push(newEval)
        }
        console.log('📦 [REAL-TIME EVAL] Stored in ref:', realTimeEvaluationsRef.current.length, 'evaluations')
        
        // Also update state for UI
        setRealTimeEvaluations([...realTimeEvaluationsRef.current])
        currentQuestionNumberRef.current++
      }
      
      return result.evaluation
    } catch (error) {
      console.error('❌ [REAL-TIME EVAL] Error:', error)
      return null
    } finally {
      isAnalyzingRef.current = false
    }
  }
  
  // Simple analysis function for flow control (not scoring)
  const analyzeAnswer = async (question: string, answer: string, criterion: string) => {
    if (isAnalyzingRef.current) return null
    if (answer === lastAnalyzedAnswerRef.current) return null
    if (answer.trim().length < 5) return null
    
    try {
      const response = await fetch('/api/interview/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer,
          criterion: criterion || 'General',
          questionNumber: currentQuestionIndex + 1,
          totalQuestions: interviewQuestions.length,
          jobTitle: jobDetails?.jobTitle,
          companyName: jobDetails?.company,
          isSetupPhase: false
        })
      })
      
      if (!response.ok) return null
      const result = await response.json()
      return result.analysis
    } catch (error) {
      return null
    }
  }
  
  // Send instruction to AI agent via session update (invisible to transcript)
  const sendAgentInstruction = (instruction: string, forceSpeak: boolean = false) => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== 'open') {
      console.log('⚠️ [INSTRUCT] Data channel not ready')
      return
    }
    
    console.log('📤 [INSTRUCT] Updating session with instruction:', instruction.substring(0, 100))
    
    // Use response.create with instructions to guide the next response
    // This doesn't add to conversation history, just guides the next AI response
    if (forceSpeak) {
      const responseMsg = {
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          instructions: instruction
        }
      }
      dc.send(JSON.stringify(responseMsg))
    } else {
      // Just log the analysis - let the AI follow its built-in instructions
      // The AI already has detailed instructions for handling incomplete answers
      console.log('📝 [INSTRUCT] Analysis logged (not forcing AI response):', instruction)
    }
  }
  
  const logTs = (label: string, text?: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    if (text !== undefined) {
      console.log(`[${ts}] ${label}`, text)
    } else {
      console.log(`[${ts}] ${label}`)
    }
  }


  // Extract message text from content array
  const extractMessageText = (content: any[] = []): string => {
    if (!Array.isArray(content)) return ""
    return content
      .map((c) => {
        if (!c || typeof c !== "object") return ""
        if (c.type === "input_text") return c.text ?? ""
        if (c.type === "audio") return c.transcript ?? ""
        if (c.type === "input_audio") return c.transcript ?? ""
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  
  const pendingUserItems = useRef<Map<string, number>>(new Map())

  const ensureElaborationState = (question: string) => {
    if (!question) return
    const existing = questionElaborationRef.current
    if (!existing || existing.question !== question) {
      questionElaborationRef.current = { question, combinedText: '', prompts: 0 }
    }
  }

  const appendToCombinedAnswer = (chunk: string) => {
    const normalizedChunk = normalizeText(chunk)
    if (!normalizedChunk) return ''
    const state = questionElaborationRef.current
    if (!state) return normalizedChunk
    const combined = state.combinedText
      ? `${state.combinedText} ${normalizedChunk}`
      : normalizedChunk
    state.combinedText = combined
    return combined
  }

  const maybePromptForElaboration = () => {
    const state = questionElaborationRef.current
    if (!state) return
    const totalWords = countWords(state.combinedText)
    if (totalWords >= 80) return
    if (state.prompts >= 2) {
      console.log('[ELABORATE] Maximum prompts reached, moving on')
      return
    }

    const promptMessage = state.prompts === 0
      ? 'Your answer seems brief. Could you please elaborate more?' 
      : 'Could you please explain it a bit more?'
    console.log(`[ELABORATE] Prompting (${state.prompts + 1}) for question "${state.question}" (wordCount=${totalWords})`)
    sendAgentInstruction(`Please politely ask: "${promptMessage}"`, true)
    state.prompts += 1
  }
  
  const handleTranscriptionCompleted = async (event: any) => {
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const itemId = event.item_id
      const finalTranscript = !event.transcript || event.transcript === "\n" ? "[inaudible]" : event.transcript
      console.log('🎤 [TRANSCRIPTION] User said:', finalTranscript.substring(0, 100))
      console.log('🎤 [TRANSCRIPTION] lastQuestionAskedRef.current:', lastQuestionAskedRef.current?.substring(0, 50) || '(EMPTY!)')
      
      if (itemId && finalTranscript) {
        console.log('[You]', finalTranscript)
        setConversation(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'user' && last.text === finalTranscript) return prev
          const next = [...prev, { role: 'user' as const, text: finalTranscript, t: Date.now() }]
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: next }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return next
        })
        
        // Real-time answer analysis
        // Only analyze if we have a meaningful question context (not setup confirmations)
        const isSetupQuestion = lastQuestionAskedRef.current.toLowerCase().includes('audio') ||
                                lastQuestionAskedRef.current.toLowerCase().includes('video') ||
                                lastQuestionAskedRef.current.toLowerCase().includes('hear') ||
                                lastQuestionAskedRef.current.toLowerCase().includes('see me') ||
                                lastQuestionAskedRef.current.toLowerCase().includes('setup') ||
                                lastQuestionAskedRef.current.toLowerCase().includes('working fine')
        
        // Debug: Log the conditions for evaluation
        console.log('🔍 [EVAL DEBUG] Checking conditions:')
        console.log('  - isSetupQuestion:', isSetupQuestion)
        console.log('  - lastQuestionAskedRef:', lastQuestionAskedRef.current?.substring(0, 50) || '(empty)')
        console.log('  - finalTranscript length:', finalTranscript.length)
        console.log('  - companyId:', companyId || '(not set)')
        
        // Skip analysis for setup questions - these just need simple confirmations
        if (isSetupQuestion) {
          console.log('⏭️ [ANALYZE] Skipping analysis for setup question')
        } else if (lastQuestionAskedRef.current && finalTranscript !== '[inaudible]' && finalTranscript.length > 5) {
          // Only analyze actual interview questions with meaningful answers
          console.log('✅ [ANALYZE] ALL CONDITIONS MET - Will call evaluateAnswer now!')
          
          const combinedAnswer = appendToCombinedAnswer(finalTranscript)
          
          // CRITICAL: Call real-time OpenAI evaluation for scoring
          // This evaluates the answer using the company's service key
          const evaluation = await evaluateAnswer(
            lastQuestionAskedRef.current,
            combinedAnswer,
            currentCriterionRef.current
          )
          
          if (evaluation) {
            console.log('✅ [REAL-TIME EVAL] Stored evaluation for question:', currentQuestionNumberRef.current - 1)
            console.log('📊 Score:', evaluation.score, '/ 100')
            console.log('📋 Reasoning:', evaluation.reasoning?.substring(0, 100))
          }
          
          // Also run simple flow analysis for redirects only
          const analysis = await analyzeAnswer(
            lastQuestionAskedRef.current,
            combinedAnswer,
            currentCriterionRef.current
          )
          
          if (analysis) {
            // Only intervene for redirect (completely off-topic)
            if (analysis.recommendation === 'redirect' && analysis.confidenceScore >= 80) {
              const prompt = analysis.followUpPrompt || 
                "I appreciate your thoughts, but could you please address the specific question I asked?"
              console.log('🔄 [ANALYZE] Redirecting (high confidence off-topic):', prompt)
              sendAgentInstruction(`Please politely redirect: "${prompt}"`, true)
            } else {
              console.log('✅ [ANALYZE] Letting AI handle flow naturally')
              maybePromptForElaboration()
            }
          }
        } else {
          console.log('⚠️ [ANALYZE] Conditions NOT met for evaluation:')
          if (!lastQuestionAskedRef.current) console.log('  - lastQuestionAskedRef is EMPTY')
          if (finalTranscript === '[inaudible]') console.log('  - finalTranscript is [inaudible]')
          if (finalTranscript.length <= 5) console.log('  - finalTranscript too short:', finalTranscript.length)
        }
      }
    } else if (event.type === 'response.audio_transcript.done') {
      const text = agentTextBufferRef.current
      console.log('🤖 [AGENT TRANSCRIPT DONE] agentTextBufferRef.current length:', text.length)
      console.log('🤖 [AGENT TRANSCRIPT DONE] Text:', text.substring(0, 100))
      
      if (text) {
        agentTextBufferRef.current = ''
        setConversation(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'agent' && last.text === text) return prev
          const next = [...prev, { role: 'agent' as const, text, t: Date.now() }]
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: next }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return next
        })
        
        // Track the question asked by the agent for real-time analysis
        // Check if agent's response contains a question (for answer analysis context)
        console.log('🤖 [AGENT] Agent spoke:', text.substring(0, 100))
        console.log('🤖 [AGENT] Contains question mark?', text.includes('?'))
        console.log('🤖 [AGENT] interviewQuestions length:', interviewQuestions.length)
        
        if (text.includes('?')) {
          // Find if this matches one of our interview questions
          const matchedQuestion = interviewQuestions.find((q, idx) => {
            const qText = q.text?.toLowerCase() || ''
            const agentText = text.toLowerCase()
            // Check if the agent mentioned key parts of the question
            const keyWords = qText.split(' ').filter((w: string) => w.length > 4).slice(0, 5)
            const matchCount = keyWords.filter((kw: string) => agentText.includes(kw)).length
            return matchCount >= 2 || agentText.includes(qText.substring(0, 30))
          })
          
          if (matchedQuestion) {
            lastQuestionAskedRef.current = matchedQuestion.text
            currentCriterionRef.current = matchedQuestion.criterion || matchedQuestion.criteria?.[0] || 'General'
            console.log('📝 [TRACK] Current question:', lastQuestionAskedRef.current.substring(0, 50))
            console.log('🎯 [TRACK] Criterion:', currentCriterionRef.current)
            ensureElaborationState(matchedQuestion.text)
          } else {
            // If no exact match, use the question text from agent's response
            // Extract the last sentence that ends with ?
            const sentences = text.split(/[.!]/).filter(s => s.includes('?'))
            console.log('📝 [TRACK] No matched question found. Extracted sentences with ?:', sentences.length)
            if (sentences.length > 0) {
              lastQuestionAskedRef.current = sentences[sentences.length - 1].trim()
              // Set a default criterion if we couldn't match to a known question
              if (!currentCriterionRef.current) {
                currentCriterionRef.current = 'General'
              }
              console.log('📝 [TRACK] Detected question:', lastQuestionAskedRef.current.substring(0, 50))
              console.log('📝 [TRACK] Using criterion:', currentCriterionRef.current)
              ensureElaborationState(lastQuestionAskedRef.current)
            } else {
              console.log('⚠️ [TRACK] Could not extract any question from agent speech')
            }
          }
        } else {
          console.log('⚠️ [TRACK] Agent spoke but no question mark found - not tracking as question')
        }
      }
    }
  }
  
  const handleTranscriptionDelta = (event: any) => {
    if (event.type === 'response.audio_transcript.delta' && typeof event.delta === 'string') {
      agentTextBufferRef.current += event.delta
      console.log('📝 [DELTA] Agent text delta:', event.delta.substring(0, 50), '| Total so far:', agentTextBufferRef.current.length, 'chars')
    }
  }
  
  const handleHistoryAdded = (item: any) => {
    if (!item || item.type !== 'message') return
    const { id: itemId, role, content = [] } = item
    
    if (itemId && role) {
      const isUser = role === "user"
      let text = extractMessageText(content)
      
      if (isUser && !text) {
        pendingUserItems.current.set(itemId, Date.now())
        console.log('[addTranscriptMessage] user item created, status:', item.status)
        text = "[Transcribing...]"
      } else if (!isUser) {
        console.log('[addTranscriptMessage] assistant item created, status:', item.status)
      }
      
      if (text && text !== "[Transcribing...]") {
        console.log(isUser ? '[You]' : '[Agent]', text)
        setConversation(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === role && last.text === text) return prev
          const next = [...prev, { role: role as 'agent' | 'user', text, t: Date.now() }]
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: next }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return next
        })
      }
    }
  }
  
  const handleHistoryUpdated = (items: any[]) => {
    console.log('[handleHistoryUpdated]', items)
    items.forEach((item: any) => {
      if (!item || item.type !== 'message') return
      const { id: itemId, content = [] } = item
      const text = extractMessageText(content)
      
      if (text) {
        setConversation(prev => {
          const updated = prev.map(convItem => {
            if (convItem.t && Math.abs(convItem.t - Date.now()) < 30000) {
              return { ...convItem, text }
            }
            return convItem
          })
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: updated }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return updated
        })
      }
    })
  }

  const [conversation, setConversation] = useState<{ role: 'agent' | 'user'; text: string; t: number }[]>([])
  const [interviewCompleted, setInterviewCompleted] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if interview is already completed
  useEffect(() => {
    if (!applicationId) {
      router.push('/')
      return
    }
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-status`, { cache: 'no-store' })
        const json = await res.json()
        
        if (res.ok && json?.ok) {
          if (!json.canInterview) {
            // Interview already completed
            setInterviewCompleted(true)
            setCheckingStatus(false)
            return
          }
        }
        
        // Interview not completed, proceed with initialization
        await init()
      } catch (e) {
        console.error('Failed to check interview status:', e)
        await init()
      }
    }
    
    const init = async () => {
      try {
        // Fetch interview questions and job details
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-questions`, { cache: 'no-store' })
        const json = await res.json()
        
        if (res.ok && json?.ok) {
          const details = {
            jobTitle: json.application?.jobTitle || 'Position',
            company: json.application?.companyName || 'Company',
            candidateName: json.application?.candidateName || 'Candidate'
          }
          
          // Store companyId for session creation
          const fetchedCompanyId = json.application?.companyId || null
          console.log('🏢 Fetched Company ID:', fetchedCompanyId)
          if (fetchedCompanyId) {
            setCompanyId(fetchedCompanyId)
            companyIdRef.current = fetchedCompanyId // Also set ref immediately
            console.log('✅ [INIT] Company ID set in both state and ref')
          } else {
            console.warn('⚠️ No company ID found in application data')
          }
          
          // Extract all questions from all rounds
          const allQuestions = json.rounds?.flatMap((round: any) => 
            round.questions?.map((q: string, index: number) => ({
              text: q,
              roundName: round.name,
              criteria: round.criteria || [],
              sequence: index + 1
            })) || []
          ) || []
          
          // Set interview duration from first round or default to 30 minutes
          const duration = json.rounds?.[0]?.duration_minutes || 30
          
          setJobDetails(details)
          setInterviewQuestions(allQuestions)
          setInterviewDuration(duration)
          setCheckingStatus(false)
          
          console.log('📋 Loaded interview questions:', allQuestions.length)
          console.log('⏱️ Interview duration:', duration, 'minutes')
          
          // Then request permissions with job context
          await requestPermissions(details, allQuestions, duration, fetchedCompanyId)
        } else {
          setCheckingStatus(false)
          // Fallback if questions not available
          await requestPermissions(null, [], 30, null)
        }
      } catch (e) {
        console.error('Failed to fetch interview questions:', e)
        setCheckingStatus(false)
        await requestPermissions(null, [], 30, null)
      }
    }
    
    checkStatus()
  }, [applicationId])

  const requestPermissions = async (details: any, questions: any[] = [], duration: number = 30, fetchedCompanyId: string | null = null) => {
    setInitializing(true)
    setError(null)
    try {
      console.log('[Init] Requesting camera + mic permissions…')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.7777778 },
          facingMode: 'user',
        },
        audio: true,
      })
      console.log('[Init] Permissions granted; local stream ready')
      streamRef.current = stream
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
        await userVideoRef.current.play().catch(() => {})
      }
      
      // Initialize AI agent session
      logTs('Init: Requesting ephemeral session…')
      
      // Use fetchedCompanyId parameter or fall back to state
      const activeCompanyId = fetchedCompanyId || companyId
      
      if (!activeCompanyId) {
        console.error('❌ Company ID not available')
        console.error('fetchedCompanyId:', fetchedCompanyId)
        console.error('companyId state:', companyId)
        throw new Error('Company ID not available. Cannot create interview session without company credentials.')
      }
      
      console.log('✅ Using Company ID:', activeCompanyId)
      const resp = await fetch(`/api/session?companyId=${encodeURIComponent(activeCompanyId)}`)
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j?.error || 'Failed to init AI agent session')
      }
      const data = await resp.json()
      logTs('Init: Ephemeral session received')
      setSessionInfo(data)
      await initRealtimeConnection(data, stream, details, questions, duration)
      setAgentReady(true)
      setInterviewPhase('greeting')
      setInterviewStartTime(Date.now())
      logTs('Agent Connected (peer connection established)')
    } catch (e: any) {
      console.error('❌ Interview initialization failed:', e)
      setError(e?.message || "Please allow camera and microphone to start the interview.")
    } finally {
      setInitializing(false)
    }
  }

  // Initialize WebRTC connection with OpenAI Realtime
  const initRealtimeConnection = async (session: any, localStream: MediaStream, details: any, questions: any[] = [], duration: number = 30) => {
    pcRef.current?.close()
    pcRef.current = null

    logTs('RTC: Creating RTCPeerConnection')
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    })
    pcRef.current = pc
    pc.onconnectionstatechange = () => {
      logTs('RTC connectionState =', pc.connectionState)
      // When agent fully connected, kick off avatar video once
      if (pc.connectionState === 'connected') {
        try { avatarVideoRef.current?.play().catch(() => {}) } catch {}
      }
    }
    pc.oniceconnectionstatechange = () => {
      logTs('RTC iceConnectionState =', pc.iceConnectionState)
    }

    const remoteStream = new MediaStream()
    if (agentAudioRef.current) {
      agentAudioRef.current.srcObject = remoteStream
      agentAudioRef.current.autoplay = true
      agentAudioRef.current.muted = false
      // Add buffering settings for smooth playback
      agentAudioRef.current.preload = 'auto'
      agentAudioRef.current.playbackRate = 1.0
      console.log('🔊 Agent audio track attached with buffering enabled')
    }
    pc.ontrack = (event) => {
      try {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t))
        } else if (event.track) {
          remoteStream.addTrack(event.track)
        }
        agentAudioRef.current?.play().catch(() => {})
        logTs('RTC: Remote track added', event.track?.kind)
      } catch {}
    }

    localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream))
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.addTransceiver('video', { direction: 'recvonly' })

    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc
    dc.onopen = () => {
      logTs('DC open')
      // Agent session is ready; start avatar animation once
      try { avatarVideoRef.current?.play().catch(() => {}) } catch {}
      try {
        // Build structured 6-step interview instructions
        let instructions = `You are Olivia, a professional AI recruiter conducting a structured video interview. Follow this EXACT 6-step process:

**IMPORTANT LANGUAGE POLICY:**
- You MUST speak ONLY in English throughout the entire interview.
- If the candidate speaks in ANY language other than English (Hindi, Spanish, French, Chinese, etc.), IMMEDIATELY and POLITELY respond:
  "I apologize, but I can only conduct this interview in English. Please respond in English so I can properly evaluate your answers. Let me repeat the question in English..."
- Then repeat the last question in English.
- DO NOT answer or respond to questions asked in any language other than English.
- This policy applies at ALL times during the interview.

**STEP 1: GREETING & SETUP CHECK**
- Greet warmly: "Hello ${details?.candidateName || 'there'}, welcome and thank you for joining today's interview."
- Confirm setup: "Before we begin, can you please confirm that your audio and video are working fine, and you can hear/see me clearly?"
- Mention language policy: "Please note that this interview will be conducted entirely in English. If you're comfortable with that, let's proceed."
- Wait for confirmation before proceeding.

**STEP 2: START INTERVIEW & TIME MANAGEMENT**  
- Once setup confirmed: "Great, let's get started. This interview will last about ${duration} minutes. I'll be asking you questions based on the ${details?.jobTitle || 'position'} role you applied for at ${details?.company || 'our company'}."
- Keep track of time and ensure interview finishes within ${duration} minutes.

**STEP 3: QUESTION FLOW**
You MUST ask ONLY these questions in this exact order. Do NOT ask any other questions, do NOT generate new questions, do NOT deviate from this list:`

        // Add the specific questions from database
        if (questions && questions.length > 0) {
          questions.forEach((q, index) => {
            instructions += `\n${index + 1}. ${q.text}`
          })
          instructions += `

**CRITICAL CONSTRAINT: QUESTION ADHERENCE**
- You MUST ask ONLY the questions listed above
- Do NOT ask any follow-up questions beyond what is listed
- Do NOT generate or improvise new questions
- Do NOT ask clarifying questions that are not in the list
- If the candidate asks you to ask a different question, politely decline and continue with the next question from the list

**ANSWER HANDLING (Simple Flow):**
After each candidate response:
1. If the answer is RELEVANT → Acknowledge briefly ("Thank you for that response" or "Got it") and proceed to the NEXT question from the list
2. If the answer is NOT relevant to the question → Politely redirect: "I appreciate your thoughts, but could you please address the specific question about [topic]?"
3. If instructed by the system to ask for elaboration → Follow the system's instruction exactly
4. Do NOT ask "Have you finished your answer?" - just listen and move forward naturally

**IMPORTANT:** 
- Do NOT ask "Have you finished?" or "Anything else to add?" - just proceed naturally
- The system will prompt you if the candidate needs to elaborate more
- Keep the flow conversational and natural`
        } else {
          instructions += `\n1. Tell me about yourself and your relevant experience.
2. Why are you interested in this ${details?.jobTitle || 'position'}?
3. What motivates you in your work?
4. Describe a challenging situation you faced and how you handled it.
5. How do you handle feedback and criticism?
6. Tell me about a time you worked in a team to achieve a goal.
7. What technical skills do you bring to this role?
8. How do you stay updated with the latest technologies in your field?
9. Describe a technical problem you solved recently.
10. Do you have any questions about the role or company?

**CRITICAL CONSTRAINT: QUESTION ADHERENCE**
- You MUST ask ONLY the questions listed above
- Do NOT ask any follow-up questions beyond what is listed
- Do NOT generate or improvise new questions
- Do NOT ask clarifying questions that are not in the list
- If the candidate asks you to ask a different question, politely decline and continue with the next question from the list

**ANSWER HANDLING (Simple Flow):**
After each candidate response:
1. If the answer is RELEVANT → Acknowledge briefly ("Thank you for that response" or "Got it") and proceed to the NEXT question from the list
2. If the answer is NOT relevant to the question → Politely redirect: "I appreciate your thoughts, but could you please address the specific question about [topic]?"
3. If instructed by the system to ask for elaboration → Follow the system's instruction exactly
4. Do NOT ask "Have you finished your answer?" - just listen and move forward naturally

**IMPORTANT:** 
- Do NOT ask "Have you finished?" or "Anything else to add?" - just proceed naturally
- The system will prompt you if the candidate needs to elaborate more
- Keep the flow conversational and natural`
        }

        instructions += `

**STEP 4: WRAP-UP & CANDIDATE QUESTIONS**
Once all questions covered (or time runs out): "That concludes my set of questions. Do you have any questions for me?"
- If question is about JD/role, answer briefly
- If question is not directly related (HR policy, compensation, next steps): "That's a great question. Our team will get back to you with the details after this interview."

**STEP 5: CLOSING**
Thank the candidate: "Thank you for your time today. We'll review your responses and share feedback through the recruitment team."

**INTERVIEW CONTEXT:**
- Candidate: ${details?.candidateName || 'Candidate'}
- Position: ${details?.jobTitle || 'Position'}  
- Company: ${details?.company || 'Company'}
- Duration: ${duration} minutes
- Total Questions: ${questions?.length || 10}

**EVALUATION CRITERIA:**
${questions?.[0]?.criteria?.join(', ') || 'Communication, Technical skills, Culture fit, Problem-solving'}

**CRITICAL REMINDERS:**
1. ALWAYS speak in English only
2. If candidate uses any other language, politely redirect to English immediately
3. Be professional, warm, and keep the interview structured and on-time
4. Maintain the English-only policy throughout the entire interview
5. Do NOT ask "Have you finished your answer?" - the system will handle elaboration prompts automatically
6. When the system instructs you to ask for elaboration, follow the exact phrasing provided
7. **CRITICAL: ONLY ask the questions listed above - NO ad-hoc questions, NO generated questions, NO clarifying questions beyond the list**
8. **If candidate asks for a different question, politely decline and continue with the next question from the list**
9. **NEVER deviate from the question list under any circumstances**`

        // Update session with instructions
        const updateMsg = {
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            instructions: instructions,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6, // Lower threshold for better sensitivity
              prefix_padding_ms: 300, // Add padding to prevent cutting off beginnings
              silence_duration_ms: 1200 // Increased from 500ms to prevent premature interruptions
            }
          }
        }
        dc.send(JSON.stringify(updateMsg))
        logTs('Session updated with structured interview flow')
        
        // Then trigger the first response
        const startMsg = {
          type: 'response.create',
          response: {
            modalities: ['audio', 'text']
          }
        }
        dc.send(JSON.stringify(startMsg))
        logTs('Interview started - Step 1: Greeting & Setup')
      } catch (e) {
        console.error('Error in dc.onopen:', e)
      }
    }
    dc.onerror = (e) => console.log('[DC] error', e)
    dc.onclose = () => console.log('[DC] close')
    dc.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        
        switch (msg.type) {
          case "conversation.item.input_audio_transcription.completed": {
            console.log('[handleTranscriptionCompleted]', msg);
            handleTranscriptionCompleted(msg);
            break;
          }
          case "response.audio_transcript.done": {
            console.log('🤖 [AGENT DONE] Agent finished speaking');
            console.log('[handleTranscriptionCompleted]', msg);
            handleTranscriptionCompleted(msg);
            
            // Increment question counter after agent speaks
            questionCountRef.current++
            console.log('🤖 [AGENT DONE] Question count:', questionCountRef.current);
            break;
          }
          case "response.audio_transcript.delta": {
            console.log('[handleTranscriptionEvent]', msg);
            handleTranscriptionDelta(msg);
            break;
          }
          case "conversation.item.created": {
            console.log('[handleHistoryAdded]', msg.item || msg);
            handleHistoryAdded(msg.item || msg);
            break;
          }
          case "conversation.item.updated": 
          case "history.updated": {
            if (msg.items) {
              handleHistoryUpdated(msg.items);
            }
            break;
          }
        }
        
        // Note: transcript deltas are already handled by handleTranscriptionDelta()
        // Only handle output_text deltas here (non-audio text responses)
        if (msg.type === 'response.output_text.delta' && typeof msg.delta === 'string') {
          agentTextBufferRef.current += msg.delta
        }
      } catch (e) {
        console.log('[DC raw]', evt.data)
      }
    }

    logTs('RTC: Creating offer…')
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const baseUrl = 'https://api.openai.com/v1/realtime'
    const model = session?.model || 'gpt-4o-realtime-preview'
    const clientSecret = session?.client_secret?.value
    if (!clientSecret) throw new Error('Missing realtime client secret from session response')

    logTs('RTC: Exchanging SDP with OpenAI…')
    const sdpResponse = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp || '',
    })
    if (!sdpResponse.ok) {
      const txt = await sdpResponse.text()
      throw new Error(`Realtime SDP exchange failed: ${txt}`)
    }
    const answerSdp = await sdpResponse.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    logTs('RTC: Remote description set (answer). Waiting for tracks…')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      pcRef.current?.close()
      pcRef.current = null
    }
  }, [])

  // Sync avatar video with agent audio (play when agent speaks, pause when silent)
  useEffect(() => {
    const agentAudio = agentAudioRef.current
    const avatarVideo = avatarVideoRef.current
    
    if (!agentAudio || !avatarVideo) return

    const handleAudioPlay = () => {
      avatarVideo.play().catch(() => {})
    }

    const handleAudioPause = () => {
      avatarVideo.pause()
    }

    const handleAudioEnded = () => {
      avatarVideo.pause()
    }

    // Listen to agent audio state changes
    agentAudio.addEventListener('play', handleAudioPlay)
    agentAudio.addEventListener('playing', handleAudioPlay)
    agentAudio.addEventListener('pause', handleAudioPause)
    agentAudio.addEventListener('ended', handleAudioEnded)

    return () => {
      agentAudio.removeEventListener('play', handleAudioPlay)
      agentAudio.removeEventListener('playing', handleAudioPlay)
      agentAudio.removeEventListener('pause', handleAudioPause)
      agentAudio.removeEventListener('ended', handleAudioEnded)
    }
  }, [agentReady])

  // Extra: lightweight VAD to pause avatar when agent is silent
  useEffect(() => {
    const agentAudio = agentAudioRef.current
    const avatarVideo = avatarVideoRef.current
    if (!agentAudio || !avatarVideo) return

    const stream = agentAudio.srcObject as MediaStream | null
    if (!stream || stream.getAudioTracks().length === 0) return

    let audioCtx: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let rafId: number | null = null
    let silentFrames = 0
    let speakingFrames = 0

    const startVAD = () => {
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        source = audioCtx.createMediaStreamSource(stream)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)
        const threshold = 5 // Lower threshold = more sensitive to speech

        const tick = () => {
          if (!analyser) return
          analyser.getByteTimeDomainData(data)
          // Calculate average absolute deviation from midpoint (128)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128)
          const avg = sum / data.length

          if (avg > threshold) {
            speakingFrames++
            silentFrames = 0
          } else {
            silentFrames++
            speakingFrames = 0
          }

          // More conservative debounce to prevent interruptions
          if (speakingFrames > 3) { // Increased from 2 to 3
            avatarVideo.play().catch(() => {})
          } else if (silentFrames > 15) { // Increased from 8 to 15
            avatarVideo.pause()
          }

          rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
      } catch (e) {
        console.warn('VAD init failed:', e)
      }
    }

    startVAD()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      try { source && source.disconnect(); analyser && analyser.disconnect(); audioCtx && audioCtx.close() } catch {}
    }
  }, [agentReady])

  const toggleMic = () => {
    const audioTracks = streamRef.current?.getAudioTracks() || []
    audioTracks.forEach(t => (t.enabled = !t.enabled))
    setMicOn(prev => !prev)
  }

  const toggleCam = () => {
    const videoTracks = streamRef.current?.getVideoTracks() || []
    videoTracks.forEach(t => (t.enabled = !t.enabled))
    setCamOn(prev => !prev)
  }

  const endInterview = async () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    try { pcRef.current?.close(); pcRef.current = null } catch {}

    // Persist transcript and mark interview as completed
    try {
      const turns = (() => {
        let arr = [] as { role: 'agent' | 'user'; text: string; t: number }[]
        try { arr = JSON.parse(JSON.stringify(conversation)) } catch { arr = conversation }
        if (agentTextBufferRef.current) {
          arr.push({ role: 'agent', text: agentTextBufferRef.current, t: Date.now() })
          agentTextBufferRef.current = ''
        }
        if (userTextBufferRef.current) {
          arr.push({ role: 'user', text: userTextBufferRef.current, t: Date.now() })
          userTextBufferRef.current = ''
        }
        return arr
      })()
      const payload = { id: applicationId, createdAt: Date.now(), conversation: turns }
      localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
      
      // Mark interview as completed in database
      const transcript = turns.map(t => `${t.role === 'agent' ? 'Interviewer' : 'Candidate'}: ${t.text}`).join('\n\n')
      console.log('📝 Saving transcript to database...')
      console.log('📝 Conversation turns:', turns.length)
      console.log('📝 Transcript length:', transcript.length)
      console.log('📝 Transcript preview:', transcript.substring(0, 300))
      
      // Step 6: Store transcript and mark as completed
      // Include real-time evaluations if available
      console.log('📊 [END INTERVIEW] Real-time evaluations collected:', realTimeEvaluations.length)
      
      const response = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript,
          startedAt: interviewStartTime, // Send actual start time for accurate duration
          realTimeEvaluations: realTimeEvaluations // Send all collected evaluations
        })
      }).catch(e => {
        console.error('❌ Failed to mark interview as completed:', e)
        return null
      })
      
      if (response) {
        const result = await response.json()
        console.log('✅ Interview marked as completed:', result)
        
        // Trigger evaluation pipeline with real-time evaluations
        // Use ref to get current evaluations (avoids stale closure)
        const evaluationsToSend = realTimeEvaluationsRef.current
        console.log('🔍 Starting evaluation pipeline...')
        console.log('📊 Sending', evaluationsToSend.length, 'real-time evaluations to final evaluation')
        console.log('📋 Evaluation details:', evaluationsToSend.map(e => ({ q: e.question_number, score: e.score })))
        
        const evaluationResponse = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript,
            realTimeEvaluations: evaluationsToSend, // Use ref to get current evaluations
            companyId: companyId // Include company ID for credential lookup
          })
        }).catch(e => {
          console.error('❌ Failed to run evaluation:', e)
          return null
        })
        
        if (evaluationResponse) {
          const evaluationResult = await evaluationResponse.json()
          
          if (!evaluationResponse.ok) {
            // Handle incomplete interview error
            if (evaluationResponse.status === 400 && evaluationResult.error === 'Incomplete interview') {
              console.warn('⚠️ Interview incomplete:', evaluationResult.message)
              console.warn('📊 Details:', evaluationResult.details)
              console.warn('Interview will be saved but not evaluated. User needs to complete more questions.')
              // Interview is saved but not evaluated - user will need to complete a new interview
            } else {
              console.error('❌ Evaluation failed:', evaluationResult)
            }
          } else {
            console.log('✅ Evaluation completed:', evaluationResult)
          }
        }
      }
      
      // Navigate to interview success page
      router.push(`/interview/${encodeURIComponent(applicationId)}/success`)
      return
    } catch {}
    
    router.push("/")
  }

  // Show "Interview Already Completed" message
  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Interview Already Completed</h1>
          <p className="text-lg text-slate-600 mb-6">
            This interview link has already been used and the interview has been completed.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Each interview link can only be used once for security purposes. If you believe this is an error, please contact the recruiting team.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/')} className="bg-black text-white hover:bg-gray-900">
              Go to Home
            </Button>
          </div>
          <div className="mt-6 text-xs text-slate-400">
            Application ID: <span className="font-mono">{applicationId.substring(0, 12)}...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while checking
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-slate-600">Checking interview status...</p>
        </div>
      </div>
    )
  }

  // Instruction Modal
  const InstructionModal = () => (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${showInstructions ? 'bg-black/60 backdrop-blur-sm' : 'pointer-events-none'}`}>
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/30 rounded-2xl shadow-2xl max-w-xl w-full mx-4 transform transition-all duration-300 ${showInstructions ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Header */}
        <div className="border-b border-emerald-500/20 px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Interview Instructions</h2>
              <p className="text-xs text-slate-400">Please read before starting</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInstructions(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-4">
          {/* Checklist Items */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">Ensure Good Lighting</h3>
                <p className="text-xs text-slate-400">Position yourself in a well-lit area. Avoid backlighting or shadows on your face.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">Test Your Microphone & Camera</h3>
                <p className="text-xs text-slate-400">Make sure both are working properly before you start. You'll see your video feed below.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">Stable Internet Connection</h3>
                <p className="text-xs text-slate-400">Use a wired connection if possible. Avoid WiFi interference for better stability.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">Quiet Environment</h3>
                <p className="text-xs text-slate-400">Choose a quiet place with minimal background noise for the best experience.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">Keep Camera On</h3>
                <p className="text-xs text-slate-400">Your camera must remain on throughout the entire interview session.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">Professional Setting</h3>
                <p className="text-xs text-slate-400">Ensure your background is clean and professional. Avoid distractions.</p>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-lg p-3">
            <p className="text-xs text-emerald-200">
              <span className="font-semibold">💡 Tip:</span> The interview will be recorded for evaluation purposes. Speak clearly and take your time answering questions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-emerald-500/20 px-5 py-4 flex gap-2 justify-end">
          <Button 
            onClick={() => setShowInstructions(false)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg text-sm px-4 py-2"
          >
            I Understand, Let's Start
          </Button>
        </div>
      </div>
    </div>
  )

  
  return (
    <>
      {/* Instruction Modal */}
      <InstructionModal />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header with Controls */}
      <header className="border-b border-emerald-500/30 bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-lg sticky top-0 z-40 shadow-lg animate-in fade-in duration-500">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-6">
          
          {/* Left: Logo + Title + Job Details (MERGED) */}
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg hover:shadow-emerald-500/50 transition-shadow duration-300 flex-shrink-0">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-base font-bold text-white leading-tight">AI Interview</h1>
              <p className="text-sm font-semibold text-emerald-300">{jobDetails?.jobTitle || 'Position'}</p>
              <p className="text-xs text-slate-400">{jobDetails?.company || 'Company'}</p>
            </div>
          </div>

          {/* Right: Controls (square buttons, no outer box) */}
          <div className="ml-auto flex items-center gap-3 animate-in fade-in scale-in duration-500">
            {/* Mic Button */}
            <Button 
              size="icon" 
              variant="ghost" 
              className={`rounded-lg transition-all duration-300 hover:scale-110 ${
                micOn 
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 hover:text-emerald-200' 
                  : 'bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-200'
              }`}
              onClick={toggleMic} 
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
            </Button>

            {/* Camera Button */}
            <Button 
              size="icon" 
              variant="ghost" 
              className={`rounded-lg transition-all duration-300 hover:scale-110 ${
                camOn 
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 hover:text-emerald-200' 
                  : 'bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-200'
              }`}
              onClick={toggleCam} 
              title={camOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {camOn ? <VideoIcon className="h-7 w-7" /> : <VideoOff className="h-7 w-7" />}
            </Button>

            {/* End Interview Button */}
            <Button 
              size="icon" 
              className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-red-500/50 transition-all duration-300 hover:scale-110" 
              onClick={endInterview} 
              title="End interview session"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-6">
        {/* Video Container - Responsive with max-width constraint */}
        <div className="w-full max-w-4xl">
          {/* 16:9 Aspect Ratio Container */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video group">
            {/* User camera preview */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
              <video
                ref={userVideoRef}
                className={`block w-full h-full object-cover object-center transition-opacity duration-300 ${camOn ? 'opacity-100' : 'opacity-30'}`}
                style={{ transform: 'scaleX(-1)', transformOrigin: 'center center' }}
                muted
                playsInline
                autoPlay
              />
              {!camOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                    <VideoOff className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="text-slate-300 font-medium">Camera is off</p>
                </div>
              )}
            </div>

            {/* Picture-in-picture Avatar overlay */}
            <div className="absolute right-4 bottom-6 md:right-6 md:bottom-8">
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-black/80 backdrop-blur-md hover:border-emerald-500/60 transition-all duration-300">
                <video
                  ref={avatarVideoRef}
                  src="https://storage.googleapis.com/ai_recruiter_bucket_prod/assets/videos/olivia_character_no_audio.mp4"
                  className="w-[150px] h-[84px] md:w-[220px] md:h-[124px] object-cover"
                  muted
                  playsInline
                  preload="auto"
                  onEnded={() => {
                    if (avatarVideoRef.current) {
                      avatarVideoRef.current.currentTime = 3
                      avatarVideoRef.current.play()
                      avatarFirstPlayRef.current = false
                    }
                  }}
                />
                <audio ref={agentAudioRef} className="hidden" />
                <div className="absolute left-2 bottom-2 text-[9px] md:text-xs font-semibold text-emerald-300 drop-shadow-lg">
                  Olivia
                </div>
                {agentReady && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600/90 text-white text-[9px] md:text-xs px-2 py-0.5 rounded-full shadow-lg">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-200 animate-pulse"></div>
                    Connected
                  </div>
                )}
              </div>
            </div>


            {/* Timer/Status - Top right */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-40">
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-white text-xs px-4 py-2 rounded-lg font-medium">
                <span className="text-slate-400">Status: </span>
                <span className="text-emerald-400 font-semibold">Recording</span>
              </div>
            </div>
          </div>

          {/* Instructions below video */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-white">Microphone</span>
              </div>
              <p className="text-xs text-slate-400">Ensure your mic is on and working properly</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <VideoIcon className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-white">Camera</span>
              </div>
              <p className="text-xs text-slate-400">Keep your camera on throughout the interview</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold text-white">Connection</span>
              </div>
              <p className="text-xs text-slate-400">Maintain a stable internet connection</p>
            </div>
          </div>
        </div>
      </main>
    </div>
    </>
  )
}
