import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Users } from 'lucide-react';
import { z } from 'zod';
import authBg from '@/assets/auth-bg.jpg';

// Custom validation for full name: each name must be 3+ letters only
const validateFullName = (name: string) => {
  const names = name.trim().split(/\s+/);
  if (names.length < 2) return false;
  return names.every(n => /^[A-Za-z]{3,}$/.test(n));
};

// Phone number: only digits, 1-13 characters
const validatePhoneNumber = (phone: string) => {
  return /^\d{1,13}$/.test(phone);
};

// Email must end with @gmail.com
const validateEmail = (email: string) => {
  return /^[^\s@]+@gmail\.com$/i.test(email);
};

// SECURITY: Role selection removed from signup - all users start as 'member'
// Admins must be promoted manually by existing admins
const signUpSchema = z.object({
  fullName: z.string().refine(validateFullName, {
    message: 'Invalid name!'
  }),
  phoneNumber: z.string().refine(validatePhoneNumber, {
    message: 'Invalid phone number!'
  }),
  email: z.string().refine(validateEmail, {
    message: 'Invalid email!'
  }),
  password: z.string().min(6, 'Password must be at least 6 characters!'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match!",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  email: z.string().email('Enter a valid email address!'),
  password: z.string().min(1, 'Password is required!'),
});

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as AuthMode) || 'signin';
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    role: 'member' as AppRole,
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});
  
  const { signUp, signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Real-time validation for specific fields
  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch (name) {
      case 'fullName':
        if (value.trim().length > 0 && !validateFullName(value)) {
          error = 'Invalid name!';
        }
        break;
      case 'phoneNumber':
        if (value.length > 0 && !validatePhoneNumber(value)) {
          error = 'Invalid phone number!';
        }
        break;
      case 'email':
        if (value.length > 0 && !validateEmail(value)) {
          error = 'Invalid email!';
        }
        break;
      case 'password':
        if (value.length > 0 && value.length < 6) {
          error = 'Password must be at least 6 characters!';
        }
        break;
      case 'confirmPassword':
        if (value.length > 0 && value !== formData.password) {
          error = "Passwords don't match!";
        }
        break;
    }
    
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
      // Trigger shake animation
      setShakeFields(prev => ({ ...prev, [name]: true }));
      setTimeout(() => {
        setShakeFields(prev => ({ ...prev, [name]: false }));
      }, 500);
    } else {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    // For phone number, only allow digits
    if (name === 'phoneNumber') {
      processedValue = value.replace(/\D/g, '');
    } else if (name === 'fullName') {
      // For full name, only allow letters and spaces
      processedValue = value.replace(/[^A-Za-z\s]/g, '');
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Real-time validation
    validateField(name, processedValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as AppRole }));
  };

  const validateForm = () => {
    try {
      if (mode === 'signup') {
        signUpSchema.parse(formData);
      } else if (mode === 'signin') {
        signInSchema.parse({ email: formData.email, password: formData.password });
      } else {
        z.string().email().parse(formData.email);
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        const newShakes: Record<string, boolean> = {};
        err.errors.forEach(e => {
          if (e.path[0]) {
            const field = e.path[0] as string;
            newErrors[field] = e.message;
            newShakes[field] = true;
          }
        });
        setErrors(newErrors);
        setShakeFields(newShakes);
        setTimeout(() => setShakeFields({}), 500);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.phoneNumber,
          formData.role
        );
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'You can now sign in to your account.',
          });
          setMode('signin');
        }
      } else if (mode === 'signin') {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Invalid credentials',
              description: 'Please check your email and password.',
              variant: 'destructive',
            });
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await resetPassword(formData.email);
        
        if (error) throw error;
        
        toast({
          title: 'Email sent',
          description: 'Check your email for password reset instructions.',
        });
        setMode('signin');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const ErrorMessage = ({ field }: { field: string }) => {
    if (!errors[field]) return null;
    return (
      <p 
        className={`text-sm text-destructive font-medium ${
          shakeFields[field] ? 'animate-shake' : ''
        }`}
      >
        {errors[field]}
      </p>
    );
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/95 backdrop-blur-sm relative z-10">
        <CardHeader className="space-y-1 pb-4 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-2xl font-bold text-primary">Chama</span>
          </div>
          
          <CardTitle className="text-xl">Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
          
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-muted p-1 mt-4">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signin' 
                  ? 'bg-card text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup' 
                  ? 'bg-card text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>
        </CardHeader>
        
        <CardContent>
          {mode === 'forgot' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-muted/50"
                  />
                </div>
                <ErrorMessage field="email" />
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-medium bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder="Enter your full name (2-4 names)"
                        value={formData.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`pl-10 bg-muted/50 ${errors.fullName ? 'border-destructive' : ''}`}
                      />
                    </div>
                    <ErrorMessage field="fullName" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        placeholder="Enter your phone number"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`pl-10 bg-muted/50 ${errors.phoneNumber ? 'border-destructive' : ''}`}
                        maxLength={13}
                      />
                    </div>
                    <ErrorMessage field="phoneNumber" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email (@gmail.com)"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`pl-10 bg-muted/50 ${errors.email ? 'border-destructive' : ''}`}
                      />
                    </div>
                    <ErrorMessage field="email" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">User Role</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Select value={formData.role} onValueChange={handleRoleChange}>
                        <SelectTrigger className="pl-10 bg-muted/50">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="treasurer">Treasurer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password (min 6 chars)"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`pl-10 pr-10 bg-muted/50 ${errors.password ? 'border-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <ErrorMessage field="password" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`pl-10 pr-10 bg-muted/50 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <ErrorMessage field="confirmPassword" />
                  </div>
                </>
              )}

              {mode === 'signin' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10 bg-muted/50"
                      />
                    </div>
                    <ErrorMessage field="email" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10 pr-10 bg-muted/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <ErrorMessage field="password" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                </>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-medium bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Custom CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
