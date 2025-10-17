"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  CreditCard, 
  Lock, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Shield
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function AddPaymentMethodPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card')
  
  // Card form state
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [cvv, setCvv] = useState("")
  const [saveCard, setSaveCard] = useState(true)
  
  // PayPal form state
  const [paypalEmail, setPaypalEmail] = useState("")
  
  // Card number formatting
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = cleaned.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    
    if (parts.length) {
      return parts.join(' ')
    } else {
      return value
    }
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardNumber(formatted)
    }
  }

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12)) {
      setExpiryMonth(value)
    }
  }

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    if (value.length <= 2) {
      setExpiryYear(value)
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    if (value.length <= 4) {
      setCvv(value)
    }
  }

  const detectCardType = (number: string): string => {
    const cleaned = number.replace(/\s/g, '')
    if (/^4/.test(cleaned)) return 'Visa'
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard'
    if (/^3[47]/.test(cleaned)) return 'American Express'
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover'
    return 'Card'
  }

  const validateCardForm = (): boolean => {
    const cleaned = cardNumber.replace(/\s/g, '')
    
    if (cleaned.length < 13 || cleaned.length > 16) {
      toast({ 
        title: 'Invalid Card Number', 
        description: 'Please enter a valid card number',
        variant: 'destructive' 
      })
      return false
    }
    
    if (!cardName.trim()) {
      toast({ 
        title: 'Name Required', 
        description: 'Please enter the cardholder name',
        variant: 'destructive' 
      })
      return false
    }
    
    const month = parseInt(expiryMonth)
    const year = parseInt(expiryYear)
    const currentYear = new Date().getFullYear() % 100
    const currentMonth = new Date().getMonth() + 1
    
    if (!expiryMonth || month < 1 || month > 12) {
      toast({ 
        title: 'Invalid Expiry Month', 
        description: 'Please enter a valid month (01-12)',
        variant: 'destructive' 
      })
      return false
    }
    
    if (!expiryYear || year < currentYear || (year === currentYear && month < currentMonth)) {
      toast({ 
        title: 'Invalid Expiry Date', 
        description: 'Card has expired or invalid year',
        variant: 'destructive' 
      })
      return false
    }
    
    if (cvv.length < 3 || cvv.length > 4) {
      toast({ 
        title: 'Invalid CVV', 
        description: 'Please enter a valid CVV (3-4 digits)',
        variant: 'destructive' 
      })
      return false
    }
    
    return true
  }

  const validatePayPalForm = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!paypalEmail.trim() || !emailRegex.test(paypalEmail)) {
      toast({ 
        title: 'Invalid Email', 
        description: 'Please enter a valid PayPal email address',
        variant: 'destructive' 
      })
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (paymentMethod === 'card') {
      if (!validateCardForm()) return
    } else {
      if (!validatePayPalForm()) return
    }
    
    setLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const payload = paymentMethod === 'card' ? {
        type: 'card',
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardName,
        expiryMonth,
        expiryYear,
        cvv,
        saveCard
      } : {
        type: 'paypal',
        email: paypalEmail
      }
      
      // TODO: Replace with actual API call
      console.log('Payment method data:', payload)
      
      toast({
        title: 'Success!',
        description: `${paymentMethod === 'card' ? 'Card' : 'PayPal'} payment method added successfully`,
      })
      
      // Redirect back to billing page after success
      setTimeout(() => {
        router.push('/dashboard/settings/billing')
      }, 1500)
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add payment method',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/settings/billing')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
        <h1 className="text-3xl font-bold">Add Payment Method</h1>
        <p className="text-gray-600 mt-2">Choose your preferred payment method to add funds to your account</p>
      </div>

      {/* Security Badge */}
      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
        <Shield className="h-5 w-5 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Secure Payment</p>
          <p className="text-xs text-emerald-700">Your payment information is encrypted and secure</p>
        </div>
      </div>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </CardTitle>
          <CardDescription>Select a payment method and enter your details</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'card' | 'paypal')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Credit/Debit Card</span>
                <span className="sm:hidden">Card</span>
              </TabsTrigger>
              <TabsTrigger value="paypal" className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z"/>
                  <path d="M2.197 21.99a.483.483 0 0 1-.478-.558L4.35 5.003c.08-.509.513-.888 1.027-.888h5.873c2.17 0 3.691.455 4.518 1.351.184.2.332.417.447.647.12.243.196.507.228.786.025.22.025.48 0 .781-.012.129-.03.259-.054.392a4.656 4.656 0 0 1-.054.29c-.028.125-.06.254-.096.386-.528 2.714-2.395 4.062-5.551 4.062H8.91a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 0 1-.794.679H2.197z"/>
                </svg>
                PayPal
              </TabsTrigger>
            </TabsList>

            {/* Card Payment Form */}
            <TabsContent value="card" className="space-y-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Card Number */}
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="flex items-center gap-2">
                      Card Number
                      <span className="text-xs text-emerald-600 font-normal">
                        {cardNumber && `(${detectCardType(cardNumber)})`}
                      </span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="pl-10 text-lg tracking-wider"
                        maxLength={19}
                        required
                      />
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      type="text"
                      placeholder="JOHN DOE"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="uppercase"
                      required
                    />
                  </div>

                  {/* Expiry and CVV */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryMonth">Expiry Month</Label>
                      <Input
                        id="expiryMonth"
                        type="text"
                        placeholder="MM"
                        value={expiryMonth}
                        onChange={handleExpiryMonthChange}
                        maxLength={2}
                        className="text-center text-lg"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryYear">Expiry Year</Label>
                      <Input
                        id="expiryYear"
                        type="text"
                        placeholder="YY"
                        value={expiryYear}
                        onChange={handleExpiryYearChange}
                        maxLength={2}
                        className="text-center text-lg"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv" className="flex items-center gap-1">
                        CVV
                        <Lock className="h-3 w-3 text-gray-400" />
                      </Label>
                      <Input
                        id="cvv"
                        type="text"
                        placeholder="123"
                        value={cvv}
                        onChange={handleCvvChange}
                        maxLength={4}
                        className="text-center text-lg tracking-wider"
                        required
                      />
                    </div>
                  </div>

                  {/* Save Card Checkbox */}
                  <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                    <Checkbox 
                      id="saveCard" 
                      checked={saveCard}
                      onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                    />
                    <label
                      htmlFor="saveCard"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Save this card for future transactions
                    </label>
                  </div>

                  {/* Security Info */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                    <p>
                      Your card information is encrypted using industry-standard SSL/TLS protocols. 
                      We never store your CVV number.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard/settings/billing')}
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Add Card
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* PayPal Payment Form */}
            <TabsContent value="paypal" className="space-y-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* PayPal Logo */}
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 rounded-lg">
                      <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z"/>
                        <path d="M2.197 21.99a.483.483 0 0 1-.478-.558L4.35 5.003c.08-.509.513-.888 1.027-.888h5.873c2.17 0 3.691.455 4.518 1.351.184.2.332.417.447.647.12.243.196.507.228.786.025.22.025.48 0 .781-.012.129-.03.259-.054.392a4.656 4.656 0 0 1-.054.29c-.028.125-.06.254-.096.386-.528 2.714-2.395 4.062-5.551 4.062H8.91a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 0 1-.794.679H2.197z"/>
                      </svg>
                      <span className="text-xl font-bold text-blue-600">PayPal</span>
                    </div>
                  </div>

                  {/* PayPal Email */}
                  <div className="space-y-2">
                    <Label htmlFor="paypalEmail">PayPal Email Address</Label>
                    <Input
                      id="paypalEmail"
                      type="email"
                      placeholder="your.email@example.com"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="text-lg"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the email address associated with your PayPal account
                    </p>
                  </div>

                  {/* PayPal Info */}
                  <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      How PayPal Integration Works
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>You'll be redirected to PayPal to authorize the payment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Log in to your PayPal account securely</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">3.</span>
                        <span>Approve the connection and you're all set!</span>
                      </li>
                    </ul>
                  </div>

                  {/* Security Info */}
                  <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-900">
                    <Shield className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <p>
                      PayPal offers buyer protection and secure transactions. Your financial information 
                      stays private and is never shared with merchants.
                    </p>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard/settings/billing')}
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Connect PayPal
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Accepted Payment Methods */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Accepted Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Visa
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Mastercard
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              American Express
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Discover
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border text-sm font-medium">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z"/>
                <path d="M2.197 21.99a.483.483 0 0 1-.478-.558L4.35 5.003c.08-.509.513-.888 1.027-.888h5.873c2.17 0 3.691.455 4.518 1.351.184.2.332.417.447.647.12.243.196.507.228.786.025.22.025.48 0 .781-.012.129-.03.259-.054.392a4.656 4.656 0 0 1-.054.29c-.028.125-.06.254-.096.386-.528 2.714-2.395 4.062-5.551 4.062H8.91a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 0 1-.794.679H2.197z"/>
              </svg>
              PayPal
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            All transactions are secured with 256-bit SSL encryption
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
