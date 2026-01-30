import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Users, CheckCircle, AlertCircle, MessageSquare, BarChart3, FileText, Plus, Send, ThumbsUp, ThumbsDown, User, Settings, LogOut, ChevronRight, ChevronDown, ChevronUp, X, Mic, MicOff, Mail, Search, RefreshCw, Trash2, XCircle, ArrowLeft, Loader2 } from 'lucide-react';

// Firebase Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDUMQlhN_x8MXQL3FF0B73LEQM_EVVj5RA",
  authDomain: "argumentor-ff17a.firebaseapp.com",
  databaseURL: "https://argumentor-ff17a-default-rtdb.firebaseio.com",
  projectId: "argumentor-ff17a",
  storageBucket: "argumentor-ff17a.firebasestorage.app",
  messagingSenderId: "347151341699",
  appId: "1:347151341699:web:a1b2c3d4e5f6g7h8i9j0"
};

// Firebase initialization
let firebaseInitialized = false;
let firebaseInitPromise = null;

const initFirebase = async () => {
  if (firebaseInitialized) return true;
  if (firebaseInitPromise) return firebaseInitPromise;
  
  firebaseInitPromise = new Promise((resolve) => {
    // Check if Firebase is already loaded
    if (window.firebase && window.firebase.database) {
      try {
        if (!window.firebaseApp) {
          window.firebaseApp = window.firebase.initializeApp(FIREBASE_CONFIG);
        }
        window.firebaseDb = window.firebase.database();
        firebaseInitialized = true;
        console.log('Firebase initialized successfully');
        resolve(true);
      } catch (error) {
        console.error('Firebase init error:', error);
        resolve(false);
      }
      return;
    }
    
    // Load Firebase via script tags
    const loadScript = (src) => {
      return new Promise((res, rej) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = res;
        script.onerror = rej;
        document.head.appendChild(script);
      });
    };
    
    // Load Firebase scripts sequentially
    loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js')
      .then(() => loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'))
      .then(() => {
        try {
          window.firebaseApp = window.firebase.initializeApp(FIREBASE_CONFIG);
          window.firebaseDb = window.firebase.database();
          firebaseInitialized = true;
          console.log('Firebase initialized successfully');
          resolve(true);
        } catch (error) {
          console.error('Firebase init error:', error);
          resolve(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load Firebase scripts:', error);
        resolve(false);
      });
  });
  
  return firebaseInitPromise;
};

// Email Service Configuration
// To enable email notifications:
// 1. Sign up at https://www.emailjs.com/ (free tier: 200 emails/month)
// 2. Create an email template with variables: {{to_email}}, {{inviter_name}}, {{conflict_title}}, {{app_link}}
// 3. Replace these values with your EmailJS credentials
const EMAIL_CONFIG = {
  enabled: true,
  serviceId: 'service_5tvziid',
  templateId: 'template_6xd4ukj',
  publicKey: 'KAyprVzfJYyG7m017',
};

// Email Service Functions
const emailService = {
  // Initialize EmailJS (call once on app load)
  init: () => {
    if (EMAIL_CONFIG.enabled && window.emailjs) {
      window.emailjs.init(EMAIL_CONFIG.publicKey);
    }
  },

  // Send invitation email
  sendInvitation: async ({ toEmail, inviterName, inviterEmail, conflictTitle, conflictId, conflictDescription }) => {
    if (!EMAIL_CONFIG.enabled) {
      console.log('Email not configured. Would send to:', toEmail);
      console.log('Invitation details:', { inviterName, conflictTitle, conflictId });
      return { success: true, simulated: true };
    }

    // Generate the invitation link
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}?invite=${conflictId}&email=${encodeURIComponent(toEmail)}`;

    try {
      // Load EmailJS if not already loaded
      if (!window.emailjs) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
          script.onload = () => {
            window.emailjs.init(EMAIL_CONFIG.publicKey);
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const templateParams = {
        to_email: toEmail,
        inviter_name: inviterName,
        inviter_email: inviterEmail,
        conflict_title: conflictTitle,
        conflict_description: conflictDescription || 'A conflict that needs resolution',
        app_link: inviteLink,
        app_name: 'The Argumentor'
      };

      const response = await window.emailjs.send(
        EMAIL_CONFIG.serviceId,
        EMAIL_CONFIG.templateId,
        templateParams
      );

      console.log('Email sent successfully:', response);
      return { success: true, response };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }
  }
};

// URL Parameter Helpers
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    inviteConflictId: params.get('invite'),
    inviteEmail: params.get('email'),
  };
};

const clearUrlParams = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  url.searchParams.delete('email');
  window.history.replaceState({}, '', url.pathname);
};

// Voice Input Hook - uses native Web Speech API
const useVoiceInput = (onResult) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please enable microphone permissions.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isSupported, onResult]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return { isListening, isSupported, startListening, stopListening };
};

// Voice Input Button Component
const VoiceInputButton = ({ onResult, className = '' }) => {
  const { isListening, isSupported, startListening } = useVoiceInput(onResult);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={startListening}
      className={`p-2 rounded-lg transition-all ${
        isListening 
          ? 'bg-red-100 text-red-600 animate-pulse' 
          : 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-600'
      } ${className}`}
      title={isListening ? 'Listening...' : 'Click to speak'}
    >
      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};

// Utility function for persistent storage
// Uses Firebase Realtime Database for shared data across all users/devices
// Falls back to window.storage (Claude) or localStorage
const storage = {
  // Convert key to Firebase-safe format
  toFirebaseKey: (key) => key.replace(/[.#$[\]:]/g, '_'),
  // Convert Firebase key back to original format
  fromFirebaseKey: (key) => key.replace(/conflict_/g, 'conflict:'),
  
  get: async (key, shared = null) => {
    try {
      // Sanitize key for Firebase (replace invalid characters)
      const firebaseKey = storage.toFirebaseKey(key);
      
      // Try Firebase first
      const fbReady = await initFirebase();
      if (fbReady && window.firebaseDb) {
        try {
          const snapshot = await window.firebaseDb.ref(`data/${firebaseKey}`).once('value');
          if (snapshot.exists()) {
            const value = snapshot.val();
            console.log(`Firebase get ${key}:`, value ? 'found' : 'null');
            return value;
          }
          console.log(`Firebase get ${key}: not found`);
          return null;
        } catch (fbError) {
          console.error('Firebase get error:', fbError);
          // Fall through to other methods
        }
      }
      
      // Try window.storage (Claude artifact environment)
      if (window.storage && window.storage.get) {
        const isShared = shared !== null ? shared : (key.startsWith('conflict:') || key === 'all-users');
        const result = await window.storage.get(key, isShared);
        if (!result) return null;
        
        let parsed = JSON.parse(result.value);
        
        // Handle double-stringified legacy data
        if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {}
        }
        
        return parsed;
      }
      
      // Fallback to localStorage
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      let parsed = JSON.parse(item);
      if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {}
      }
      
      return parsed;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  
  set: async (key, value, shared = null) => {
    try {
      // Sanitize key for Firebase
      const firebaseKey = storage.toFirebaseKey(key);
      
      // Try Firebase first
      const fbReady = await initFirebase();
      if (fbReady && window.firebaseDb) {
        try {
          await window.firebaseDb.ref(`data/${firebaseKey}`).set(value);
          console.log(`Firebase set ${key}: success`);
          return true;
        } catch (fbError) {
          console.error('Firebase set error:', fbError);
          // Fall through to other methods
        }
      }
      
      // Try window.storage (Claude artifact environment)
      if (window.storage && window.storage.set) {
        const isShared = shared !== null ? shared : (key.startsWith('conflict:') || key === 'all-users');
        await window.storage.set(key, JSON.stringify(value), isShared);
        return true;
      }
      
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },
  
  list: async (prefix, shared = null) => {
    try {
      // Sanitize prefix for Firebase
      const firebasePrefix = storage.toFirebaseKey(prefix);
      
      // Try Firebase first
      const fbReady = await initFirebase();
      if (fbReady && window.firebaseDb) {
        try {
          const snapshot = await window.firebaseDb.ref('data').once('value');
          if (snapshot.exists()) {
            const allData = snapshot.val();
            const keys = Object.keys(allData)
              .filter(k => k.startsWith(firebasePrefix))
              .map(k => storage.fromFirebaseKey(k)); // Convert back to original format
            console.log(`Firebase list ${prefix}:`, keys.length, 'keys');
            return keys;
          }
          console.log(`Firebase list ${prefix}: no data`);
          return [];
        } catch (fbError) {
          console.error('Firebase list error:', fbError);
          // Fall through to other methods
        }
      }
      
      // Try window.storage (Claude artifact environment)
      if (window.storage && window.storage.list) {
        const isShared = shared !== null ? shared : (prefix.startsWith('conflict:') || prefix === 'all-users');
        const result = await window.storage.list(prefix, isShared);
        if (Array.isArray(result)) return result;
        return result?.keys || [];
      }
      
      // Fallback to localStorage
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('Storage list error:', error);
      return [];
    }
  },
  
  delete: async (key, shared = null) => {
    try {
      // Sanitize key for Firebase
      const firebaseKey = storage.toFirebaseKey(key);
      
      // Try Firebase first
      const fbReady = await initFirebase();
      if (fbReady && window.firebaseDb) {
        try {
          await window.firebaseDb.ref(`data/${firebaseKey}`).remove();
          console.log(`Firebase delete ${key}: success`);
          return true;
        } catch (fbError) {
          console.error('Firebase delete error:', fbError);
          // Fall through to other methods
        }
      }
      
      // Try window.storage (Claude artifact environment)
      if (window.storage && window.storage.delete) {
        const isShared = shared !== null ? shared : (key.startsWith('conflict:') || key === 'all-users');
        await window.storage.delete(key, isShared);
        return true;
      }
      
      // Fallback to localStorage
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  },
  
  // Check which storage backend is active
  getBackendInfo: async () => {
    const fbReady = await initFirebase();
    if (fbReady && window.firebaseDb) {
      return { backend: 'firebase', available: true };
    }
    if (window.storage) {
      return { backend: 'claude', available: true };
    }
    return { backend: 'localStorage', available: true };
  },
  
  // Migration: Copy data from localStorage/Claude to Firebase
  migrateToFirebase: async () => {
    const fbReady = await initFirebase();
    if (!fbReady || !window.firebaseDb) {
      console.log('Firebase not available for migration');
      return { migrated: 0 };
    }
    
    let migrated = 0;
    
    // Try to migrate from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('conflict:') || key === 'all-users')) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          const firebaseKey = storage.toFirebaseKey(key);
          await window.firebaseDb.ref(`data/${firebaseKey}`).set(value);
          migrated++;
          console.log(`Migrated ${key} to Firebase`);
        } catch (e) {
          console.error(`Failed to migrate ${key}:`, e);
        }
      }
    }
    
    return { migrated };
  }
};

// Main App Component
export default function TheArgumentor() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [conflicts, setConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingInvite, setPendingInvite] = useState(null); // Track pending invitation from URL

  useEffect(() => {
    // Initialize email service
    emailService.init();
    
    // Check for invitation link in URL
    const { inviteConflictId, inviteEmail } = getUrlParams();
    if (inviteConflictId) {
      console.log('Invitation detected:', inviteConflictId, inviteEmail);
      setPendingInvite({ conflictId: inviteConflictId, email: inviteEmail });
    }
    
    loadUserAndConflicts();
    
    // Failsafe: If loading takes more than 5 seconds, show login
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('Loading timeout - forcing to login screen');
        setLoading(false);
        setView('login');
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  const loadUserAndConflicts = async () => {
    setLoading(true);
    try {
      // Run migration to copy private conflicts to shared storage
      console.log('Running conflict migration...');
      const migrationResult = await storage.migrateConflictsToShared();
      console.log('Migration result:', migrationResult);
      
      // Run migration to copy private users to shared storage
      console.log('Running user migration...');
      const userMigrationResult = await storage.migrateUsersToShared();
      console.log('User migration result:', userMigrationResult);
      
      const user = await storage.get('current-user');
      if (user) {
        setCurrentUser(user);
        await loadConflicts();
        setView('dashboard');
      } else {
        setView('login');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setView('login');
    }
    setLoading(false);
  };

  const loadConflicts = async (retryCount = 0) => {
    console.log('=== loadConflicts() START ===', 'retry:', retryCount);
    try {
      console.log('Step 1: Listing conflict keys from SHARED storage...');
      const keys = await storage.list('conflict:', true);
      console.log('Step 2: Found keys:', keys);
      console.log('Step 2a: Number of keys:', keys.length);
      console.log('Step 2b: Type of keys:', typeof keys, Array.isArray(keys));
      
      if (!keys || keys.length === 0) {
        console.log('No keys found, setting empty array');
        setConflicts([]);
        return;
      }
      
      console.log('Step 3: Fetching conflict data for each key...');
      const conflictPromises = keys.map(async (key) => {
        try {
          console.log(`  -> Fetching ${key} from SHARED storage...`);
          const data = await storage.get(key, true);
          console.log(`  -> Got data for ${key}:`, data);
          return data;
        } catch (error) {
          console.error(`  -> Error loading conflict ${key}:`, error);
          return null;
        }
      });
      
      console.log('Step 4: Waiting for all promises...');
      const conflictData = await Promise.all(conflictPromises);
      console.log('Step 5: All data fetched:', conflictData);
      
      const validConflicts = conflictData.filter(c => c !== null);
      console.log('Step 6: Valid conflicts after filtering:', validConflicts);
      console.log('Step 7: Setting conflicts state with', validConflicts.length, 'conflicts');
      setConflicts(validConflicts);
      console.log('Step 8: setConflicts called');
      console.log('=== loadConflicts() END ===');
    } catch (error) {
      console.error('ERROR in loadConflicts:', error);
      
      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.log(`Retrying in ${delay}ms...`);
        setTimeout(() => loadConflicts(retryCount + 1), delay);
      } else {
        console.error('Max retries reached, giving up');
        setConflicts([]);
        // Show error to user
        alert('Unable to load conflicts. Please refresh the page. If the problem persists, the storage system may be temporarily unavailable.');
      }
    }
  };

  const handleLogin = async (user) => {
    console.log('handleLogin called with user:', user);
    try {
      await storage.set('current-user', user);
      console.log('User saved to storage');
      setCurrentUser(user);
      console.log('currentUser state set');
      
      // Always load conflicts before showing dashboard
      console.log('Loading conflicts...');
      await loadConflicts();
      console.log('Conflicts loaded');
      
      // Check if there's a pending invitation
      if (pendingInvite) {
        console.log('Processing pending invite:', pendingInvite);
        // Clear URL params
        clearUrlParams();
        
        // Try to find and open the invited conflict
        const invitedConflict = await storage.get(`conflict:${pendingInvite.conflictId}`);
        if (invitedConflict) {
          console.log('Found invited conflict:', invitedConflict.title);
          setSelectedConflict(invitedConflict);
          setView('conflict-detail');
          setPendingInvite(null);
          return;
        } else {
          console.log('Invited conflict not found');
        }
        setPendingInvite(null);
      }
      
      setView('dashboard');
      console.log('View changed to dashboard');
    } catch (error) {
      console.error('Error saving user:', error);
      // Even if storage fails, still log in for this session
      setCurrentUser(user);
      setView('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await storage.set('current-user', null);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
    setCurrentUser(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center">
        <div className="text-stone-600 text-lg font-light">Loading The Argumentor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      {view === 'login' && <LoginView onLogin={handleLogin} pendingInvite={pendingInvite} />}
      {view === 'dashboard' && (
        <DashboardView 
          user={currentUser} 
          conflicts={conflicts}
          onLogout={handleLogout}
          onSelectConflict={(conflict) => {
            setSelectedConflict(conflict);
            setView('conflict-detail');
          }}
          onCreateConflict={() => setView('create-conflict')}
          onRefresh={loadConflicts}
          onUserManagement={() => setView('user-management')}
        />
      )}
      {view === 'create-conflict' && (
        <CreateConflictView 
          user={currentUser}
          onBack={() => setView('dashboard')}
          onCreated={async () => {
            console.log('onCreated callback fired');
            console.log('Reloading conflicts...');
            await loadConflicts();
            console.log('Conflicts reloaded, switching to dashboard');
            console.log('Current conflicts state:', conflicts);
            setView('dashboard');
          }}
        />
      )}
      {view === 'conflict-detail' && selectedConflict && (
        <ConflictDetailView
          conflict={selectedConflict}
          user={currentUser}
          onBack={() => {
            setSelectedConflict(null);
            setView('dashboard');
          }}
          onUpdate={async () => {
            try {
              await loadConflicts();
              const updated = await storage.get(`conflict:${selectedConflict.id}`);
              if (updated) {
                setSelectedConflict(updated);
              }
            } catch (error) {
              console.error('Error updating conflict:', error);
              // Still try to reload conflicts even if individual conflict fetch fails
              try {
                await loadConflicts();
              } catch (loadError) {
                console.error('Error reloading conflicts:', loadError);
              }
            }
          }}
        />
      )}
      {view === 'user-management' && currentUser?.role === 'admin' && (
        <UserManagementView
          user={currentUser}
          conflicts={conflicts}
          onBack={() => setView('dashboard')}
          onRefresh={loadConflicts}
        />
      )}
    </div>
  );
}

// Login View Component
function LoginView({ onLogin, pendingInvite }) {
  const [mode, setMode] = useState(pendingInvite ? 'signup' : 'login'); // Default to signup if invited
  const [email, setEmail] = useState(pendingInvite?.email || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('mentee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);

  // Load invite details when component mounts
  useEffect(() => {
    const loadInviteDetails = async () => {
      if (pendingInvite?.conflictId) {
        try {
          const conflict = await storage.get(`conflict:${pendingInvite.conflictId}`);
          if (conflict) {
            setInviteDetails({
              title: conflict.title,
              description: conflict.problemStatement?.what,
              inviterName: conflict.mentees?.find(m => m.id === conflict.createdBy)?.name || 'Someone'
            });
          }
        } catch (error) {
          console.error('Error loading invite details:', error);
        }
      }
    };
    loadInviteDetails();
  }, [pendingInvite]);

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log('Login button clicked');
    setError('');
    setLoading(true);

    try {
      // Get all users from storage (shared so users can log in from anywhere)
      console.log('Fetching all users...');
      const allUsers = await storage.get('all-users', true) || [];
      console.log('All users:', allUsers);
      
      // Find user by email
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      console.log('Found user:', user);
      
      if (!user) {
        setError('No account found with this email. Please sign up first.');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      // Check if user is deactivated
      if (user.isActive === false) {
        setError('Your account has been deactivated. Please contact an administrator.');
        setLoading(false);
        return;
      }

      // Login successful
      console.log('Login successful, calling onLogin');
      await onLogin(user);
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  const handleSignup = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log('Signup button clicked');
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!name.trim()) {
        setError('Please enter your name');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      // Get existing users (shared so users can log in from anywhere)
      console.log('Fetching existing users...');
      const allUsers = await storage.get('all-users', true) || [];
      console.log('Existing users:', allUsers);
      
      // Check if email already exists
      if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError('An account with this email already exists. Please login instead.');
        setLoading(false);
        return;
      }

      // Create new user
      const newUser = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role,
        createdAt: new Date().toISOString()
      };
      console.log('New user created:', newUser);

      // Save to all users (shared)
      const updatedUsers = [...allUsers, newUser];
      console.log('Saving updated users:', updatedUsers);
      const saved = await storage.set('all-users', updatedUsers, true);
      console.log('Users saved successfully:', saved);

      // Link user to any existing conflict invitations by email
      try {
        console.log('Checking for existing conflict invitations...');
        const conflictKeys = await storage.list('conflict:', true);
        let linkedConflicts = 0;
        
        for (const key of conflictKeys) {
          try {
            const conflict = await storage.get(key, true);
            if (conflict?.mentees) {
              const menteeIndex = conflict.mentees.findIndex(
                m => m.email?.toLowerCase() === newUser.email.toLowerCase() && m.id?.startsWith('mentee-')
              );
              
              if (menteeIndex !== -1) {
                // Update mentee entry with real user ID and name
                conflict.mentees[menteeIndex] = {
                  ...conflict.mentees[menteeIndex],
                  id: newUser.id,
                  name: newUser.name
                };
                conflict.updatedAt = new Date().toISOString();
                await storage.set(key, conflict, true);
                linkedConflicts++;
                console.log(`Linked user to conflict: ${conflict.title}`);
              }
            }
          } catch (conflictErr) {
            console.error(`Error checking conflict ${key}:`, conflictErr);
          }
        }
        
        if (linkedConflicts > 0) {
          console.log(`Linked user to ${linkedConflicts} existing conflict(s)`);
        }
      } catch (linkErr) {
        console.error('Error linking user to conflicts:', linkErr);
        // Don't block signup if linking fails
      }

      // Login the new user
      console.log('Calling onLogin with new user');
      await onLogin(newUser);
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Invitation Banner */}
        {pendingInvite && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-800 mb-1">You've Been Invited!</h3>
                {inviteDetails ? (
                  <>
                    <p className="text-sm text-amber-700 mb-2">
                      <strong>{inviteDetails.inviterName}</strong> has invited you to help resolve a conflict:
                    </p>
                    <p className="text-sm text-amber-900 font-medium">"{inviteDetails.title}"</p>
                  </>
                ) : (
                  <p className="text-sm text-amber-700">
                    Someone has invited you to help resolve a conflict. Sign up or login to view it.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-5xl font-light text-stone-800 mb-2 tracking-tight">
            The Argumentor
          </h1>
          <p className="text-stone-500 font-light text-lg">
            Resolve conflicts with clarity
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-200">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="mentee">Mentee - Participate in conflict resolution</option>
                  <option value="mentor">Mentor - Guide conflict resolution</option>
                  <option value="fly-on-wall">Fly on the Wall - Observe and advise</option>
                  <option value="omniscient">Omniscient - Oversee all conflicts</option>
                  <option value="admin">Admin - System administration</option>
                </select>
              </div>

              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-stone-400 text-sm mt-6">
          Demo version - All data stored locally in your browser
        </p>
      </div>
    </div>
  );
}

// User Management View Component (Admin Only)
function UserManagementView({ user, conflicts, onBack, onRefresh }) {
  const [allUsers, setAllUsers] = useState([]);
  const [allConflicts, setAllConflicts] = useState(conflicts || []); // Initialize with passed conflicts
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignData, setReassignData] = useState({ conflict: null, role: null, currentUser: null });
  const [showAddToConflictModal, setShowAddToConflictModal] = useState(false);
  const [addToConflictUser, setAddToConflictUser] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'mentee' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  // Merge user state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceUser, setMergeSourceUser] = useState(null);
  const [mergeTargetUser, setMergeTargetUser] = useState(null);
  const [duplicateUsers, setDuplicateUsers] = useState([]);

  // Load all users and all conflicts from storage
  useEffect(() => {
    loadAllData();
  }, []);

  // Update allConflicts when conflicts prop changes
  useEffect(() => {
    if (conflicts && conflicts.length > 0) {
      setAllConflicts(conflicts);
    }
  }, [conflicts]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load all users
      const allUsersList = await storage.get('all-users', true) || [];
      console.log('Loaded users:', allUsersList);
      setAllUsers(Array.isArray(allUsersList) ? allUsersList : []);
      
      // Load ALL conflicts from shared storage (admin sees everything)
      try {
        const conflictKeys = await storage.list('conflict:', true);
        console.log('Found conflict keys:', conflictKeys);
        const loadedConflicts = [];
        const keysArray = Array.isArray(conflictKeys) ? conflictKeys : [];
        for (const key of keysArray) {
          try {
            const conflict = await storage.get(key, true);
            if (conflict) {
              loadedConflicts.push(conflict);
            }
          } catch (e) {
            console.error('Error loading conflict:', key, e);
          }
        }
        console.log('Loaded all conflicts for admin:', loadedConflicts);
        if (loadedConflicts.length > 0) {
          setAllConflicts(loadedConflicts);
        }
      } catch (conflictError) {
        console.error('Error loading conflicts, using passed conflicts:', conflictError);
        // Fall back to passed conflicts prop
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload function for after changes
  const reloadData = async () => {
    await loadAllData();
    if (onRefresh) onRefresh();
  };

  // Get conflicts for a specific user
  const getUserConflicts = (userId) => {
    return allConflicts.filter(c => {
      const isMentee = c.mentees?.some(m => m.id === userId);
      const isFlyOnWall = c.flyOnWall?.id === userId;
      const isOmniscient = c.omniscient?.id === userId;
      const isCreator = c.createdBy === userId;
      return isMentee || isFlyOnWall || isOmniscient || isCreator;
    });
  };

  // Toggle user active status
  const toggleUserStatus = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert("You cannot deactivate your own account!");
      return;
    }
    
    setActionLoading(targetUser.id);
    try {
      const newStatus = targetUser.isActive === false ? true : false;
      const updatedUser = { ...targetUser, isActive: newStatus };
      await storage.set(`user:${targetUser.id}`, updatedUser, true);
      
      // Also update the all-users list for login validation
      const allUsersList = await storage.get('all-users', true) || [];
      const updatedAllUsers = allUsersList.map(u => 
        u.id === targetUser.id ? { ...u, isActive: newStatus } : u
      );
      await storage.set('all-users', updatedAllUsers, true);
      
      setAllUsers(prev => prev.map(u => 
        u.id === targetUser.id ? updatedUser : u
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  // Change user role
  const changeUserRole = async (targetUser, newRole) => {
    if (targetUser.id === user.id && newRole !== 'admin') {
      if (!confirm("Are you sure you want to remove your own admin privileges?")) {
        return;
      }
    }
    
    setActionLoading(targetUser.id);
    try {
      const updatedUser = { ...targetUser, role: newRole };
      await storage.set(`user:${targetUser.id}`, updatedUser, true);
      
      // Also update the all-users list
      const allUsersList = await storage.get('all-users', true) || [];
      const updatedAllUsers = allUsersList.map(u => 
        u.id === targetUser.id ? { ...u, role: newRole } : u
      );
      await storage.set('all-users', updatedAllUsers, true);
      
      setAllUsers(prev => prev.map(u => 
        u.id === targetUser.id ? updatedUser : u
      ));
    } catch (error) {
      console.error('Error changing user role:', error);
      alert('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user permanently
  const deleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert("You cannot delete your own account!");
      return;
    }
    
    // Check if user is involved in any conflicts
    const userConflicts = getUserConflicts(targetUser.id);
    
    let confirmMsg = `Are you sure you want to permanently delete "${targetUser.name}"?\n\nThis action cannot be undone.`;
    
    if (userConflicts.length > 0) {
      confirmMsg = `WARNING: "${targetUser.name}" is involved in ${userConflicts.length} conflict(s).\n\n` +
        `Deleting this user will:\n` +
        `• Remove them from all conflicts they're participating in\n` +
        `• Their contributions (comments, alternatives, etc.) will remain but be orphaned\n\n` +
        `Consider deactivating instead if you want to preserve their association with conflicts.\n\n` +
        `Are you sure you want to permanently delete this user?`;
    }
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    // Double confirmation for users with conflicts
    if (userConflicts.length > 0) {
      if (!confirm(`FINAL CONFIRMATION: Delete "${targetUser.name}" and remove them from ${userConflicts.length} conflict(s)?`)) {
        return;
      }
    }
    
    setActionLoading(`delete-${targetUser.id}`);
    try {
      // Remove user from all conflicts they're involved in
      for (const conflict of userConflicts) {
        let updatedConflict = { ...conflict };
        let needsUpdate = false;
        
        // Remove from mentees
        if (conflict.mentees?.some(m => m.id === targetUser.id)) {
          updatedConflict.mentees = conflict.mentees.filter(m => m.id !== targetUser.id);
          needsUpdate = true;
        }
        
        // Remove from mentor
        if (conflict.mentor?.id === targetUser.id) {
          updatedConflict.mentor = null;
          needsUpdate = true;
        }
        
        // Remove from flyOnWall
        if (conflict.flyOnWall?.id === targetUser.id) {
          updatedConflict.flyOnWall = null;
          needsUpdate = true;
        }
        
        // Remove from omniscient
        if (conflict.omniscient?.id === targetUser.id) {
          updatedConflict.omniscient = null;
          needsUpdate = true;
        }
        
        // Remove from termsAcceptance.acceptedBy
        if (conflict.termsAcceptance?.acceptedBy?.includes(targetUser.id)) {
          updatedConflict.termsAcceptance = {
            ...conflict.termsAcceptance,
            acceptedBy: conflict.termsAcceptance.acceptedBy.filter(id => id !== targetUser.id)
          };
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          updatedConflict.updatedAt = new Date().toISOString();
          await storage.set(`conflict:${conflict.id}`, updatedConflict, true);
        }
      }
      
      // Remove user from all-users list
      const allUsersList = await storage.get('all-users', true) || [];
      const updatedAllUsers = allUsersList.filter(u => u.id !== targetUser.id);
      await storage.set('all-users', updatedAllUsers, true);
      
      // Update local state
      setAllUsers(prev => prev.filter(u => u.id !== targetUser.id));
      
      // Reload data to reflect conflict changes
      await reloadData();
      
      alert(`User "${targetUser.name}" has been permanently deleted.`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Check console for details.');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete conflict permanently
  const deleteConflict = async (conflict) => {
    const confirmMsg = `Are you sure you want to permanently delete the conflict "${conflict.title}"?\n\n` +
      `This will remove:\n` +
      `• All participant assignments\n` +
      `• All communication history\n` +
      `• All proposed alternatives\n` +
      `• All ratings and acknowledgments\n\n` +
      `This action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    setActionLoading(`delete-conflict-${conflict.id}`);
    try {
      // Delete the conflict from storage
      await storage.delete(`conflict:${conflict.id}`, true);
      
      // Update local state
      setAllConflicts(prev => prev.filter(c => c.id !== conflict.id));
      
      // Refresh parent data
      if (onRefresh) onRefresh();
      
      alert(`Conflict "${conflict.title}" has been permanently deleted.`);
    } catch (error) {
      console.error('Error deleting conflict:', error);
      alert('Failed to delete conflict. Check console for details.');
    } finally {
      setActionLoading(null);
    }
  };

  // Remove user from conflict
  const removeFromConflict = async (conflict, roleType, targetUserId) => {
    setActionLoading(`${conflict.id}-${roleType}`);
    try {
      let updatedConflict = { ...conflict };
      
      if (roleType === 'mentee') {
        updatedConflict.mentees = conflict.mentees.filter(m => m.id !== targetUserId);
      } else if (roleType === 'flyOnWall') {
        updatedConflict.flyOnWall = null;
      } else if (roleType === 'omniscient') {
        updatedConflict.omniscient = null;
      }
      
      updatedConflict.updatedAt = new Date().toISOString();
      await storage.set(`conflict:${conflict.id}`, updatedConflict, true);
      
      // Refresh conflicts
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error removing user from conflict:', error);
      alert('Failed to remove user from conflict');
    } finally {
      setActionLoading(null);
    }
  };

  // Open reassign modal
  const openReassignModal = (conflict, role, currentUserId) => {
    setReassignData({ conflict, role, currentUser: currentUserId });
    setShowReassignModal(true);
  };

  // Reassign user to conflict
  const reassignUser = async (newUserId) => {
    const { conflict, role, currentUser } = reassignData;
    if (!conflict || !role) return;
    
    setActionLoading(`reassign-${conflict.id}`);
    try {
      let updatedConflict = { ...conflict };
      const newUser = allUsers.find(u => u.id === newUserId);
      
      if (!newUser) {
        alert('User not found');
        return;
      }
      
      if (role === 'mentee') {
        // Remove current mentee if specified
        if (currentUser) {
          updatedConflict.mentees = conflict.mentees.filter(m => m.id !== currentUser);
        }
        // Add new mentee
        if (!updatedConflict.mentees.some(m => m.id === newUserId)) {
          updatedConflict.mentees.push({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email
          });
        }
      } else if (role === 'flyOnWall') {
        updatedConflict.flyOnWall = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email
        };
      } else if (role === 'omniscient') {
        updatedConflict.omniscient = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email
        };
      }
      
      updatedConflict.updatedAt = new Date().toISOString();
      await storage.set(`conflict:${conflict.id}`, updatedConflict, true);
      
      setShowReassignModal(false);
      setReassignData({ conflict: null, role: null, currentUser: null });
      
      // Refresh conflicts
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error reassigning user:', error);
      alert('Failed to reassign user');
    } finally {
      setActionLoading(null);
    }
  };

  // Add user to conflict
  const addUserToConflict = async (conflictId, roleInConflict) => {
    if (!addToConflictUser) return;
    
    const conflict = allConflicts.find(c => c.id === conflictId);
    if (!conflict) {
      alert('Conflict not found');
      return;
    }
    
    setActionLoading(`add-${conflictId}`);
    try {
      let updatedConflict = { ...conflict };
      
      if (roleInConflict === 'mentee') {
        if (!updatedConflict.mentees) updatedConflict.mentees = [];
        if (!updatedConflict.mentees.some(m => m.id === addToConflictUser.id)) {
          updatedConflict.mentees.push({
            id: addToConflictUser.id,
            name: addToConflictUser.name,
            email: addToConflictUser.email
          });
        }
      } else if (roleInConflict === 'flyOnWall') {
        updatedConflict.flyOnWall = {
          id: addToConflictUser.id,
          name: addToConflictUser.name,
          email: addToConflictUser.email
        };
      } else if (roleInConflict === 'omniscient') {
        updatedConflict.omniscient = {
          id: addToConflictUser.id,
          name: addToConflictUser.name,
          email: addToConflictUser.email
        };
      }
      
      updatedConflict.updatedAt = new Date().toISOString();
      await storage.set(`conflict:${conflict.id}`, updatedConflict, true);
      
      setShowAddToConflictModal(false);
      setAddToConflictUser(null);
      
      // Reload all data to reflect changes
      await reloadData();
    } catch (error) {
      console.error('Error adding user to conflict:', error);
      alert('Failed to add user to conflict');
    } finally {
      setActionLoading(null);
    }
  };

  // Create new user (admin function)
  const createUser = async () => {
    const { name, email, password, role } = newUserData;
    
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    // Check if email already exists
    if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      alert('A user with this email already exists');
      return;
    }
    
    setActionLoading('create-user');
    try {
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: user.id
      };
      
      // Add to all-users list (shared storage for login)
      const updatedAllUsers = [...allUsers, newUser];
      await storage.set('all-users', updatedAllUsers, true);
      
      // Update local state
      setAllUsers(updatedAllUsers);
      
      // Reset form and close modal
      setNewUserData({ name: '', email: '', password: '', role: 'mentee' });
      setShowCreateUserModal(false);
      
      alert(`User "${newUser.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    } finally {
      setActionLoading(null);
    }
  };

  // Find users with duplicate emails
  const findDuplicateEmails = () => {
    const emailMap = {};
    allUsers.forEach(u => {
      const email = u.email?.toLowerCase();
      if (email) {
        if (!emailMap[email]) {
          emailMap[email] = [];
        }
        emailMap[email].push(u);
      }
    });
    
    // Return only emails with more than one user
    const duplicates = Object.entries(emailMap)
      .filter(([_, users]) => users.length > 1)
      .map(([email, users]) => ({ email, users }));
    
    return duplicates;
  };

  // Open merge modal for a specific user
  const openMergeModal = (sourceUser) => {
    // Find other users with the same email
    const sameEmailUsers = allUsers.filter(
      u => u.email?.toLowerCase() === sourceUser.email?.toLowerCase() && u.id !== sourceUser.id
    );
    
    if (sameEmailUsers.length === 0) {
      alert('No other users found with the same email address.');
      return;
    }
    
    setMergeSourceUser(sourceUser);
    setMergeTargetUser(null);
    setShowMergeModal(true);
  };

  // Merge users: transfer all records from source to target, then delete source
  const mergeUsers = async () => {
    if (!mergeSourceUser || !mergeTargetUser) {
      alert('Please select both source and target users');
      return;
    }
    
    if (mergeSourceUser.id === mergeTargetUser.id) {
      alert('Cannot merge a user with themselves');
      return;
    }
    
    if (mergeSourceUser.id === user.id) {
      alert('Cannot merge away your own account. Select yourself as the target user instead.');
      return;
    }
    
    const confirmMsg = `Are you sure you want to merge "${mergeSourceUser.name}" into "${mergeTargetUser.name}"?\n\n` +
      `This will:\n` +
      `• Transfer all conflict participations to "${mergeTargetUser.name}"\n` +
      `• Delete the account "${mergeSourceUser.name}"\n\n` +
      `This action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    setActionLoading('merge-users');
    try {
      console.log('Starting user merge:', { source: mergeSourceUser, target: mergeTargetUser });
      
      let conflictsUpdated = 0;
      
      // Update all conflicts to replace source user with target user
      for (const conflict of allConflicts) {
        let needsUpdate = false;
        let updatedConflict = { ...conflict };
        
        // Check and update mentees
        if (conflict.mentees && conflict.mentees.length > 0) {
          const sourceIndex = conflict.mentees.findIndex(m => 
            m.id === mergeSourceUser.id || 
            m.email?.toLowerCase() === mergeSourceUser.email?.toLowerCase()
          );
          
          if (sourceIndex !== -1) {
            // Check if target is already a mentee
            const targetAlreadyMentee = conflict.mentees.some(m => 
              m.id === mergeTargetUser.id || 
              m.email?.toLowerCase() === mergeTargetUser.email?.toLowerCase()
            );
            
            if (targetAlreadyMentee) {
              // Remove the source user (target already exists)
              updatedConflict.mentees = conflict.mentees.filter((_, idx) => idx !== sourceIndex);
            } else {
              // Replace source with target
              updatedConflict.mentees = conflict.mentees.map((m, idx) => 
                idx === sourceIndex 
                  ? { id: mergeTargetUser.id, name: mergeTargetUser.name, email: mergeTargetUser.email, ...m, id: mergeTargetUser.id }
                  : m
              );
            }
            needsUpdate = true;
          }
        }
        
        // Check and update mentor
        if (conflict.mentor && (
          conflict.mentor.id === mergeSourceUser.id || 
          conflict.mentor.email?.toLowerCase() === mergeSourceUser.email?.toLowerCase()
        )) {
          updatedConflict.mentor = {
            ...conflict.mentor,
            id: mergeTargetUser.id,
            name: mergeTargetUser.name,
            email: mergeTargetUser.email
          };
          needsUpdate = true;
        }
        
        // Check and update flyOnWall
        if (conflict.flyOnWall && (
          conflict.flyOnWall.id === mergeSourceUser.id || 
          conflict.flyOnWall.email?.toLowerCase() === mergeSourceUser.email?.toLowerCase()
        )) {
          updatedConflict.flyOnWall = {
            ...conflict.flyOnWall,
            id: mergeTargetUser.id,
            name: mergeTargetUser.name,
            email: mergeTargetUser.email
          };
          needsUpdate = true;
        }
        
        // Check and update omniscient
        if (conflict.omniscient && (
          conflict.omniscient.id === mergeSourceUser.id || 
          conflict.omniscient.email?.toLowerCase() === mergeSourceUser.email?.toLowerCase()
        )) {
          updatedConflict.omniscient = {
            ...conflict.omniscient,
            id: mergeTargetUser.id,
            name: mergeTargetUser.name,
            email: mergeTargetUser.email
          };
          needsUpdate = true;
        }
        
        // Check and update createdBy
        if (conflict.createdBy === mergeSourceUser.id) {
          updatedConflict.createdBy = mergeTargetUser.id;
          needsUpdate = true;
        }
        
        // Check and update updatedBy
        if (conflict.updatedBy === mergeSourceUser.id) {
          updatedConflict.updatedBy = mergeTargetUser.id;
          needsUpdate = true;
        }
        
        // Check and update termsAcceptance
        if (conflict.termsAcceptance?.acceptedBy?.includes(mergeSourceUser.id)) {
          updatedConflict.termsAcceptance = {
            ...conflict.termsAcceptance,
            acceptedBy: conflict.termsAcceptance.acceptedBy
              .filter(id => id !== mergeSourceUser.id)
              .concat(conflict.termsAcceptance.acceptedBy.includes(mergeTargetUser.id) ? [] : [mergeTargetUser.id])
          };
          needsUpdate = true;
        }
        
        // Check and update alternatives in steps
        if (conflict.steps?.exploreAlternatives?.alternatives) {
          const hasSourceAlternatives = conflict.steps.exploreAlternatives.alternatives.some(
            alt => alt.createdBy === mergeSourceUser.id || alt.createdByEmail?.toLowerCase() === mergeSourceUser.email?.toLowerCase()
          );
          if (hasSourceAlternatives) {
            updatedConflict.steps = {
              ...conflict.steps,
              exploreAlternatives: {
                ...conflict.steps.exploreAlternatives,
                alternatives: conflict.steps.exploreAlternatives.alternatives.map(alt => {
                  if (alt.createdBy === mergeSourceUser.id || alt.createdByEmail?.toLowerCase() === mergeSourceUser.email?.toLowerCase()) {
                    return {
                      ...alt,
                      createdBy: mergeTargetUser.id,
                      createdByName: mergeTargetUser.name,
                      createdByEmail: mergeTargetUser.email
                    };
                  }
                  return alt;
                })
              }
            };
            needsUpdate = true;
          }
        }
        
        // Check and update comments
        if (conflict.comments && conflict.comments.length > 0) {
          const hasSourceComments = conflict.comments.some(
            c => c.authorId === mergeSourceUser.id || c.authorEmail?.toLowerCase() === mergeSourceUser.email?.toLowerCase()
          );
          if (hasSourceComments) {
            updatedConflict.comments = conflict.comments.map(c => {
              if (c.authorId === mergeSourceUser.id || c.authorEmail?.toLowerCase() === mergeSourceUser.email?.toLowerCase()) {
                return {
                  ...c,
                  authorId: mergeTargetUser.id,
                  author: mergeTargetUser.name,
                  authorEmail: mergeTargetUser.email
                };
              }
              return c;
            });
            needsUpdate = true;
          }
        }
        
        // Save updated conflict if changes were made
        if (needsUpdate) {
          updatedConflict.updatedAt = new Date().toISOString();
          updatedConflict.mergeNote = `User ${mergeSourceUser.email} merged into ${mergeTargetUser.email} on ${new Date().toISOString()}`;
          await storage.set(`conflict:${conflict.id}`, updatedConflict, true);
          conflictsUpdated++;
          console.log(`Updated conflict: ${conflict.title}`);
        }
      }
      
      // Remove source user from all-users list
      const updatedAllUsers = allUsers.filter(u => u.id !== mergeSourceUser.id);
      await storage.set('all-users', updatedAllUsers, true);
      
      // Update local state
      setAllUsers(updatedAllUsers);
      
      // Close modal
      setShowMergeModal(false);
      setMergeSourceUser(null);
      setMergeTargetUser(null);
      
      // Reload data to reflect changes
      await reloadData();
      
      alert(`Merge complete!\n\n` +
        `• "${mergeSourceUser.name}" has been merged into "${mergeTargetUser.name}"\n` +
        `• ${conflictsUpdated} conflict(s) were updated\n` +
        `• The duplicate account has been removed`);
      
    } catch (error) {
      console.error('Error merging users:', error);
      alert('Failed to merge users. Check console for details.');
    } finally {
      setActionLoading(null);
    }
  };

  // Get users with same email as a given user
  const getSameEmailUsers = (targetUser) => {
    return allUsers.filter(
      u => u.email?.toLowerCase() === targetUser.email?.toLowerCase() && u.id !== targetUser.id
    );
  };

  // Check for duplicate emails on load
  useEffect(() => {
    const duplicates = findDuplicateEmails();
    setDuplicateUsers(duplicates);
    if (duplicates.length > 0) {
      console.log('Found duplicate email users:', duplicates);
    }
  }, [allUsers]);

  // Filter users
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = !searchTerm || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && u.isActive !== false) ||
      (filterStatus === 'inactive' && u.isActive === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Role options
  const roleOptions = [
    { value: 'mentee', label: 'Mentee' },
    { value: 'mentor', label: 'Mentor' },
    { value: 'fly-on-wall', label: 'Fly on the Wall' },
    { value: 'omniscient', label: 'Omniscient' },
    { value: 'admin', label: 'Admin' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-800">User Management</h1>
              <p className="text-xs text-stone-500">Manage users, roles, and conflict assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setActionLoading('test-data');
                try {
                  // Create test conflict: Archer's Party Location
                  const testConflict = {
                    id: `conflict-test-${Date.now()}`,
                    title: "Archer's Party Location Disagreement",
                    model: "personal",
                    problemStatement: {
                      who: "Parents (Mom and Dad) planning Archer's birthday party",
                      what: "We originally planned an outdoor party but weather forecast shows rain. Now we can't agree on an alternative indoor location.",
                      where: "Originally planned for backyard, now considering: living room, garage, local community center, or indoor play place",
                      when: "Party is scheduled for this Saturday at 2pm. Need to decide by Thursday to notify guests of any venue change.",
                      how: "Mom wants to book the indoor play place (more fun for kids but expensive). Dad prefers the garage (free but needs cleaning and setup). We've been going back and forth without resolution."
                    },
                    desiredOutcome: "Agree on a party location that works within our budget, provides a fun experience for Archer and friends, and can be confirmed in time to notify guests.",
                    actualOutcome: "",
                    status: "pending-acceptance",
                    statusHistory: [
                      { status: "pending-acceptance", timestamp: new Date().toISOString() }
                    ],
                    createdBy: user.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    updatedBy: user.id,
                    responseHours: "9-5",
                    responseWaitTime: 15,
                    responseWindow: 15,
                    termsAcceptance: {
                      required: true,
                      acceptedBy: [user.id],
                      proposedChanges: {},
                      status: "pending"
                    },
                    mentees: [],
                    mentor: null,
                    flyOnWall: null,
                    omniscient: null,
                    comments: [],
                    steps: {
                      identifyDefine: { completed: false, data: {} },
                      communicate: { completed: false, cycles: [], acknowledged: false },
                      exploreAlternatives: { completed: false, alternatives: [] },
                      evaluateSelect: { completed: false, ratings: {}, selected: null },
                      agreeImplement: { completed: false, acknowledged: [] },
                      followUp: { completed: false, ratings: {} }
                    }
                  };
                  
                  await storage.set(`conflict:${testConflict.id}`, testConflict, true);
                  await reloadData();
                  
                  alert(`Test conflict created!\n\nTitle: "${testConflict.title}"\n\nNo mentees assigned - you can add participants from this panel.`);
                } catch (error) {
                  console.error('Error creating test data:', error);
                  alert('Failed to create test data. Check console for details.');
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === 'test-data'}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              title="Load test conflict data"
            >
              {actionLoading === 'test-data' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Load Test Data</span>
            </button>
            <button
              onClick={async () => {
                setActionLoading('migrate-firebase');
                try {
                  const result = await storage.migrateToFirebase();
                  await reloadData();
                  alert(`Migration to Firebase complete!\n\n${result.migrated} item(s) migrated.`);
                } catch (error) {
                  console.error('Firebase migration error:', error);
                  alert('Firebase migration failed. Check console for details.');
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === 'migrate-firebase'}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              title="Migrate local data to Firebase"
            >
              {actionLoading === 'migrate-firebase' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Migrate to Firebase</span>
            </button>
            <button
              onClick={async () => {
                setActionLoading('sync');
                try {
                  // Run migrations
                  const conflictResult = await storage.migrateConflictsToShared();
                  const userResult = await storage.migrateUsersToShared();
                  console.log('Sync results:', { conflictResult, userResult });
                  
                  // Reload data
                  await reloadData();
                  
                  alert(`Sync complete!\nConflicts migrated: ${conflictResult.migrated}\nUsers migrated: ${userResult.migrated}`);
                } catch (error) {
                  console.error('Sync error:', error);
                  alert('Sync failed. Check console for details.');
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === 'sync'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              title="Sync data from private to shared storage"
            >
              {actionLoading === 'sync' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Sync Data</span>
            </button>
            <button
              onClick={async () => {
                setActionLoading('repair');
                try {
                  // Find and fix double-stringified conflicts
                  const conflictKeys = await storage.list('conflict:', true);
                  let repaired = 0;
                  let linked = 0;
                  
                  // Get all users for linking
                  const allUsersList = await storage.get('all-users', true) || [];
                  
                  for (const key of conflictKeys) {
                    try {
                      let conflict = null;
                      let needsSave = false;
                      
                      // Get raw value from window.storage
                      if (window.storage && window.storage.get) {
                        const result = await window.storage.get(key, true);
                        if (result && result.value) {
                          let parsed = JSON.parse(result.value);
                          
                          // Check if it's double-stringified (still a string after first parse)
                          if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
                            // It's double-stringified, fix it
                            conflict = JSON.parse(parsed);
                            needsSave = true;
                            repaired++;
                            console.log(`Repaired double-stringified conflict: ${key}`, conflict.title);
                          } else {
                            conflict = parsed;
                          }
                        }
                      }
                      
                      // Link users to mentee entries that still have mentee- IDs
                      if (conflict && conflict.mentees) {
                        for (let i = 0; i < conflict.mentees.length; i++) {
                          const mentee = conflict.mentees[i];
                          
                          // Check if this mentee has a temporary ID and needs linking
                          if (mentee.id?.startsWith('mentee-') && mentee.email) {
                            // Find a user with matching email
                            const matchingUser = allUsersList.find(
                              u => u.email?.toLowerCase() === mentee.email.toLowerCase()
                            );
                            
                            if (matchingUser) {
                              // Check if this user is already linked elsewhere in mentees
                              const alreadyLinked = conflict.mentees.some(
                                m => m.id === matchingUser.id
                              );
                              
                              if (!alreadyLinked) {
                                // Link the user
                                conflict.mentees[i] = {
                                  ...mentee,
                                  id: matchingUser.id,
                                  name: matchingUser.name
                                };
                                needsSave = true;
                                linked++;
                                console.log(`Linked ${matchingUser.email} to conflict: ${conflict.title}`);
                              } else {
                                // User already linked, remove the duplicate mentee- entry
                                conflict.mentees.splice(i, 1);
                                i--; // Adjust index after removal
                                needsSave = true;
                                console.log(`Removed duplicate mentee entry for ${mentee.email} in: ${conflict.title}`);
                              }
                            }
                          }
                        }
                        
                        // Remove duplicate mentee entries (same email appearing multiple times)
                        const seenEmails = new Set();
                        const uniqueMentees = [];
                        for (const mentee of conflict.mentees) {
                          const email = mentee.email?.toLowerCase();
                          if (email && !seenEmails.has(email)) {
                            seenEmails.add(email);
                            uniqueMentees.push(mentee);
                          } else if (email && seenEmails.has(email)) {
                            console.log(`Removing duplicate mentee ${email} from: ${conflict.title}`);
                            needsSave = true;
                          }
                        }
                        if (uniqueMentees.length !== conflict.mentees.length) {
                          conflict.mentees = uniqueMentees;
                        }
                      }
                      
                      // Save if any changes were made
                      if (needsSave && conflict) {
                        conflict.updatedAt = new Date().toISOString();
                        await window.storage.set(key, JSON.stringify(conflict), true);
                      }
                    } catch (e) {
                      console.error(`Error checking/repairing ${key}:`, e);
                    }
                  }
                  
                  // Reload data
                  await reloadData();
                  
                  let message = 'Repair complete!\n\n';
                  if (repaired > 0) {
                    message += `• ${repaired} conflict(s) had corrupted data and were fixed\n`;
                  }
                  if (linked > 0) {
                    message += `• ${linked} user(s) were linked to their conflict invitations\n`;
                  }
                  if (repaired === 0 && linked === 0) {
                    message += 'No issues found. All data is OK.';
                  }
                  
                  alert(message);
                } catch (error) {
                  console.error('Repair error:', error);
                  alert('Repair failed. Check console for details.');
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === 'repair'}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              title="Repair corrupted conflict data and link users"
            >
              {actionLoading === 'repair' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Repair Data</span>
            </button>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create User</span>
            </button>
            <button
              onClick={reloadData}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-stone-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2 text-stone-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Total Users</span>
            </div>
            <div className="text-2xl font-bold text-stone-800">{allUsers.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Active</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {allUsers.filter(u => u.isActive !== false).length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Inactive</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {allUsers.filter(u => u.isActive === false).length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Admins</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {allUsers.filter(u => u.role === 'admin').length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">Conflicts</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{allConflicts.length}</div>
          </div>
          <div className={`rounded-xl p-4 shadow-sm border ${duplicateUsers.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-stone-200'}`}>
            <div className={`flex items-center gap-2 mb-1 ${duplicateUsers.length > 0 ? 'text-orange-600' : 'text-stone-400'}`}>
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Duplicates</span>
            </div>
            <div className={`text-2xl font-bold ${duplicateUsers.length > 0 ? 'text-orange-600' : 'text-stone-400'}`}>
              {duplicateUsers.length}
            </div>
          </div>
        </div>

        {/* Duplicate Users Warning */}
        {duplicateUsers.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 mb-1">Duplicate Email Addresses Detected</h3>
                <p className="text-sm text-orange-700 mb-3">
                  The following email addresses have multiple user accounts. Consider merging them to consolidate conflict history.
                </p>
                <div className="space-y-2">
                  {duplicateUsers.map(({ email, users }) => (
                    <div key={email} className="bg-white rounded-lg p-3 border border-orange-200">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="font-medium text-stone-800">{email}</span>
                          <span className="text-sm text-stone-500 ml-2">({users.length} accounts)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-stone-500">
                            {users.map(u => u.name).join(', ')}
                          </div>
                          <button
                            onClick={() => openMergeModal(users[0])}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-lg font-medium transition-colors"
                          >
                            Merge Users
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              {roleOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200 text-center">
            <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map(targetUser => {
              const userConflicts = getUserConflicts(targetUser.id);
              const isExpanded = selectedUser === targetUser.id;
              const isActive = targetUser.isActive !== false;
              
              return (
                <div 
                  key={targetUser.id}
                  className={`bg-white rounded-xl shadow-sm border ${isActive ? 'border-stone-200' : 'border-red-200 bg-red-50'}`}
                >
                  {/* User Row */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${isActive ? 'bg-amber-500' : 'bg-stone-400'}`}>
                          {targetUser.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-800 truncate">{targetUser.name}</span>
                            {targetUser.id === user.id && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">You</span>
                            )}
                            {!isActive && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactive</span>
                            )}
                          </div>
                          <div className="text-sm text-stone-500 truncate">{targetUser.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {/* Role Dropdown */}
                        <select
                          value={targetUser.role || 'mentee'}
                          onChange={(e) => changeUserRole(targetUser, e.target.value)}
                          disabled={actionLoading === targetUser.id}
                          className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                        >
                          {roleOptions.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        
                        {/* Toggle Active */}
                        <button
                          onClick={() => toggleUserStatus(targetUser)}
                          disabled={actionLoading === targetUser.id || targetUser.id === user.id}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            isActive 
                              ? 'hover:bg-red-50 text-red-600' 
                              : 'hover:bg-green-50 text-green-600'
                          }`}
                          title={isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {actionLoading === targetUser.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isActive ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* Merge Users - show if duplicate emails exist */}
                        {getSameEmailUsers(targetUser).length > 0 && (
                          <button
                            onClick={() => openMergeModal(targetUser)}
                            disabled={actionLoading === 'merge-users'}
                            className="p-2 rounded-lg transition-colors hover:bg-orange-50 text-orange-600"
                            title={`Merge with ${getSameEmailUsers(targetUser).length} duplicate account(s)`}
                          >
                            <Users className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Delete User */}
                        {targetUser.id !== user.id && (
                          <button
                            onClick={() => deleteUser(targetUser)}
                            disabled={actionLoading === `delete-${targetUser.id}`}
                            className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-600 disabled:opacity-50"
                            title="Delete User Permanently"
                          >
                            {actionLoading === `delete-${targetUser.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        
                        {/* Expand/Collapse */}
                        <button
                          onClick={() => setSelectedUser(isExpanded ? null : targetUser.id)}
                          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-stone-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-stone-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="flex gap-4 mt-3 text-xs text-stone-500">
                      <span>{userConflicts.length} conflict{userConflicts.length !== 1 ? 's' : ''}</span>
                      <span>Joined {new Date(targetUser.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Expanded: User's Conflicts */}
                  {isExpanded && (
                    <div className="border-t border-stone-200 p-4 bg-stone-50">
                      <h4 className="font-medium text-stone-700 mb-3">Assigned Conflicts</h4>
                      {userConflicts.length === 0 ? (
                        <p className="text-sm text-stone-500">No conflicts assigned</p>
                      ) : (
                        <div className="space-y-3">
                          {userConflicts.map(conflict => {
                            const isMentee = conflict.mentees?.some(m => m.id === targetUser.id);
                            const isFlyOnWall = conflict.flyOnWall?.id === targetUser.id;
                            const isOmniscient = conflict.omniscient?.id === targetUser.id;
                            const isCreator = conflict.createdBy === targetUser.id;
                            
                            const roles = [];
                            if (isCreator) roles.push('Creator');
                            if (isMentee) roles.push('Mentee');
                            if (isFlyOnWall) roles.push('Fly on Wall');
                            if (isOmniscient) roles.push('Omniscient');
                            
                            return (
                              <div 
                                key={conflict.id}
                                className="bg-white rounded-lg p-3 border border-stone-200"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-stone-800 truncate">{conflict.title}</div>
                                    <div className="text-xs text-stone-500 mt-1">
                                      {roles.join(' • ')} | {conflict.status || 'In Progress'}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {/* Reassign Button */}
                                    {(isMentee || isFlyOnWall || isOmniscient) && !isCreator && (
                                      <button
                                        onClick={() => openReassignModal(
                                          conflict,
                                          isMentee ? 'mentee' : isFlyOnWall ? 'flyOnWall' : 'omniscient',
                                          targetUser.id
                                        )}
                                        className="p-1.5 hover:bg-amber-50 text-amber-600 rounded transition-colors"
                                        title="Reassign"
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                      </button>
                                    )}
                                    {/* Remove Button */}
                                    {(isMentee || isFlyOnWall || isOmniscient) && !isCreator && (
                                      <button
                                        onClick={() => removeFromConflict(
                                          conflict,
                                          isMentee ? 'mentee' : isFlyOnWall ? 'flyOnWall' : 'omniscient',
                                          targetUser.id
                                        )}
                                        disabled={actionLoading === `${conflict.id}-${isMentee ? 'mentee' : isFlyOnWall ? 'flyOnWall' : 'omniscient'}`}
                                        className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors disabled:opacity-50"
                                        title="Remove from Conflict"
                                      >
                                        {actionLoading === `${conflict.id}-${isMentee ? 'mentee' : isFlyOnWall ? 'flyOnWall' : 'omniscient'}` ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Add to Conflict Button */}
                      <button
                        onClick={() => {
                          setAddToConflictUser(targetUser);
                          setShowAddToConflictModal(true);
                        }}
                        className="mt-4 flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add to Conflict
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Conflicts Management Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-stone-800 mb-4">All Conflicts</h2>
          {allConflicts.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200 text-center">
              <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">No conflicts found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Participants</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Created</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {allConflicts
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map(conflict => (
                        <tr key={conflict.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-stone-800 truncate max-w-xs">{conflict.title}</div>
                            <div className="text-xs text-stone-500 truncate max-w-xs">{conflict.problemStatement?.what}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              conflict.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              conflict.status === 'pending-acceptance' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {(conflict.status || 'pending').replace(/-/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-stone-600">
                              {conflict.mentees?.length || 0} mentee{(conflict.mentees?.length || 0) !== 1 ? 's' : ''}
                              {conflict.mentor && ' • Mentor'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-500">
                            {new Date(conflict.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => deleteConflict(conflict)}
                              disabled={actionLoading === `delete-conflict-${conflict.id}`}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete Conflict"
                            >
                              {actionLoading === `delete-conflict-${conflict.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && reassignData.conflict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-800">Reassign User</h3>
              <p className="text-sm text-stone-500 mt-1">
                Select a new user for the {reassignData.role === 'flyOnWall' ? 'Fly on Wall' : reassignData.role} role in "{reassignData.conflict.title}"
              </p>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {allUsers
                  .filter(u => {
                    // Don't show the current user being replaced
                    if (u.id === reassignData.currentUser) return false;
                    // Don't show inactive users
                    if (u.isActive === false) return false;
                    // For mentee role, don't show users already in the conflict as mentees
                    if (reassignData.role === 'mentee' && reassignData.conflict.mentees?.some(m => m.id === u.id)) return false;
                    return true;
                  })
                  .map(u => (
                    <button
                      key={u.id}
                      onClick={() => reassignUser(u.id)}
                      disabled={actionLoading === `reassign-${reassignData.conflict.id}`}
                      className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 rounded-lg border border-stone-200 transition-colors disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-medium">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-stone-800">{u.name}</div>
                        <div className="text-xs text-stone-500">{u.email}</div>
                      </div>
                      <div className="text-xs text-stone-400 capitalize">{u.role}</div>
                    </button>
                  ))
                }
              </div>
            </div>
            <div className="p-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setReassignData({ conflict: null, role: null, currentUser: null });
                }}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Conflict Modal */}
      {showAddToConflictModal && addToConflictUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-800">Add {addToConflictUser.name} to a Conflict</h3>
              <p className="text-sm text-stone-500 mt-1">
                Select a conflict and role to assign this user
              </p>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {allConflicts.filter(c => c.status !== 'resolved').length === 0 ? (
                <p className="text-stone-500 text-center py-4">No open conflicts available</p>
              ) : (
                <div className="space-y-3">
                  {allConflicts
                    .filter(c => c.status !== 'resolved')
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map(conflict => {
                    const isAlreadyMentee = conflict.mentees?.some(m => m.id === addToConflictUser.id);
                    const isAlreadyFlyOnWall = conflict.flyOnWall?.id === addToConflictUser.id;
                    const isAlreadyOmniscient = conflict.omniscient?.id === addToConflictUser.id;
                    const isCreator = conflict.createdBy === addToConflictUser.id;
                    
                    return (
                      <div key={conflict.id} className="border border-stone-200 rounded-lg p-4">
                        <div className="font-medium text-stone-800 mb-1">{conflict.title}</div>
                        <div className="text-xs text-stone-500 mb-3">
                          {conflict.mentees?.length || 0} mentees • {conflict.status || 'In Progress'}
                        </div>
                        
                        {isCreator ? (
                          <div className="text-xs text-amber-600">User is the creator of this conflict</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => addUserToConflict(conflict.id, 'mentee')}
                              disabled={isAlreadyMentee || actionLoading === `add-${conflict.id}`}
                              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                isAlreadyMentee 
                                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                            >
                              {isAlreadyMentee ? '✓ Mentee' : '+ Add as Mentee'}
                            </button>
                            <button
                              onClick={() => addUserToConflict(conflict.id, 'flyOnWall')}
                              disabled={isAlreadyFlyOnWall || actionLoading === `add-${conflict.id}`}
                              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                isAlreadyFlyOnWall 
                                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {isAlreadyFlyOnWall ? '✓ Fly on Wall' : '+ Fly on Wall'}
                            </button>
                            <button
                              onClick={() => addUserToConflict(conflict.id, 'omniscient')}
                              disabled={isAlreadyOmniscient || actionLoading === `add-${conflict.id}`}
                              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                isAlreadyOmniscient 
                                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              }`}
                            >
                              {isAlreadyOmniscient ? '✓ Omniscient' : '+ Omniscient'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => {
                  setShowAddToConflictModal(false);
                  setAddToConflictUser(null);
                }}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-800">Create New User</h3>
              <p className="text-sm text-stone-500 mt-1">
                Add a new user to the system
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {roleOptions.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-stone-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUserData({ name: '', email: '', password: '', role: 'mentee' });
                }}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={actionLoading === 'create-user'}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === 'create-user' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Users Modal */}
      {showMergeModal && mergeSourceUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-orange-50">
              <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Merge User Accounts
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Combine duplicate accounts with the same email address
              </p>
            </div>
            
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Source User (to be merged/deleted) */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Source Account (will be deleted)
                </label>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">
                      {mergeSourceUser.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-stone-800">{mergeSourceUser.name}</div>
                      <div className="text-sm text-stone-500">{mergeSourceUser.email}</div>
                      <div className="text-xs text-stone-400">ID: {mergeSourceUser.id}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-red-600">
                    This account will be removed after merge
                  </div>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronDown className="w-6 h-6 text-stone-400" />
              </div>
              
              {/* Target User (to keep) */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Target Account (will be kept)
                </label>
                <div className="space-y-2">
                  {getSameEmailUsers(mergeSourceUser).map(targetOption => {
                    const isSelected = mergeTargetUser?.id === targetOption.id;
                    const targetConflicts = getUserConflicts(targetOption.id);
                    
                    return (
                      <button
                        key={targetOption.id}
                        onClick={() => setMergeTargetUser(targetOption)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                            isSelected ? 'bg-green-500' : 'bg-stone-400'
                          }`}>
                            {targetOption.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-stone-800">{targetOption.name}</div>
                            <div className="text-sm text-stone-500">{targetOption.email}</div>
                            <div className="text-xs text-stone-400">
                              Role: {targetOption.role} • {targetConflicts.length} conflict(s) • ID: {targetOption.id}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Preview of what will happen */}
              {mergeTargetUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 mb-2 text-sm">What will happen:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• All conflicts from "{mergeSourceUser.name}" will be transferred to "{mergeTargetUser.name}"</li>
                    <li>• Comments, alternatives, and other contributions will be reassigned</li>
                    <li>• The account "{mergeSourceUser.name}" will be permanently deleted</li>
                    <li>• "{mergeTargetUser.name}" will retain their login credentials</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-stone-200 flex justify-end gap-3 bg-stone-50">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeSourceUser(null);
                  setMergeTargetUser(null);
                }}
                className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={mergeUsers}
                disabled={!mergeTargetUser || actionLoading === 'merge-users'}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {actionLoading === 'merge-users' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Merge Accounts
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dashboard View Component
function DashboardView({ user, conflicts, onLogout, onSelectConflict, onCreateConflict, onRefresh, onUserManagement }) {
  const [filter, setFilter] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Debug: Log what we received
  console.log('=== DASHBOARD RENDER ===');
  console.log('User:', user);
  console.log('User email:', user?.email);
  console.log('User ID:', user?.id);
  console.log('Total conflicts received:', conflicts?.length);
  console.log('All conflicts:', conflicts);

  // Fetch debug info on mount
  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get backend info
        const backendInfo = await storage.getBackendInfo();
        
        // Try to list conflicts
        const keys = await storage.list('conflict:', true);
        
        setDebugInfo({
          backend: backendInfo.backend,
          backendAvailable: backendInfo.available,
          keyCount: keys?.length || 0,
          keys: keys?.slice(0, 5) || []
        });
      } catch (error) {
        setDebugInfo({ error: error.message });
      }
    };
    fetchDebugInfo();
  }, []);

  // Reload conflicts when dashboard mounts or when conflicts array is empty
  useEffect(() => {
    console.log('Dashboard effect triggered, conflicts count:', conflicts.length);
    const refreshConflicts = async () => {
      if (conflicts.length === 0 && !isRefreshing) {
        console.log('No conflicts found, triggering refresh...');
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };
    refreshConflicts();
  }, [conflicts.length]);

  const userConflicts = conflicts.filter(c => {
    // Check if user is a participant by ID
    const isParticipantById = c.mentees?.some(m => m.id === user.id) ||
                               c.mentor?.id === user.id ||
                               c.flyOnWall?.id === user.id ||
                               c.omniscient?.id === user.id;
    
    // Check if user is an invited mentee by email
    const isInvitedByEmail = c.mentees?.some(m => m.email?.toLowerCase() === user.email?.toLowerCase());
    
    // Check if user created the conflict
    const isCreator = c.createdBy === user.id;
    
    // Admin sees everything
    const isAdmin = user.role === 'admin';
    
    // Debug logging for troubleshooting
    console.log(`Filter check for conflict "${c.title}":`, {
      conflictId: c.id,
      userEmail: user.email,
      userId: user.id,
      userRole: user.role,
      menteeEmails: c.mentees?.map(m => m.email),
      menteeIds: c.mentees?.map(m => m.id),
      createdBy: c.createdBy,
      isParticipantById,
      isInvitedByEmail,
      isCreator,
      isAdmin,
      willInclude: isAdmin || isParticipantById || isInvitedByEmail || isCreator
    });
    
    if (isAdmin) return true;
    return isParticipantById || isInvitedByEmail || isCreator;
  });

  const openConflicts = userConflicts.filter(c => c.status !== 'resolved');
  const resolvedConflicts = userConflicts.filter(c => c.status === 'resolved');

  const avgTimeToResolution = resolvedConflicts.length > 0
    ? resolvedConflicts.reduce((sum, c) => {
        const start = new Date(c.createdAt);
        const end = new Date(c.resolvedAt || c.updatedAt);
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0) / resolvedConflicts.length
    : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src="data:image/png;base64,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"
                alt="The Argumentor Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-light text-stone-800 tracking-tight">
                The Argumentor
              </h1>
              <p className="text-xs text-stone-500 font-light">How things are going</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <button
                onClick={onUserManagement}
                className="flex items-center gap-2 bg-stone-700 hover:bg-stone-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                title="Manage Users"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Manage Users</span>
              </button>
            )}
            <div className="text-right">
              <div className="text-sm font-medium text-stone-700">{user.name}</div>
              <div className="text-xs text-stone-500 capitalize">{user.role.replace('-', ' ')}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            icon={<AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
            label="Open Conflicts"
            value={openConflicts.length}
            color="orange"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
            label="Resolved"
            value={resolvedConflicts.length}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />}
            label="Avg. Resolution Time"
            value={`${avgTimeToResolution.toFixed(1)}h`}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
            label="Total Conflicts"
            value={userConflicts.length}
            color="purple"
          />
        </div>

        {/* New Conflict Button */}
        {(user.role === 'mentee' || user.role === 'mentor' || user.role === 'omniscient' || user.role === 'fly-on-wall') && (
          <div className="mb-4">
            <button
              onClick={onCreateConflict}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              New Conflict
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === null
                ? 'bg-amber-600 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'open'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'resolved'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Resolved
          </button>
        </div>

        {/* Conflicts List */}
        <div className="space-y-4">
          {(filter === null ? userConflicts : filter === 'open' ? openConflicts : resolvedConflicts)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .map(conflict => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onClick={() => onSelectConflict(conflict)}
              />
            ))}

          {userConflicts.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 text-lg font-light">No conflicts yet</p>
              <p className="text-stone-400 text-sm mt-2">Create your first conflict to get started</p>
              
              {/* Debug info - temporary */}
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left text-xs">
                <p className="font-bold text-yellow-800 mb-2">Debug Info:</p>
                <p className="text-yellow-700">Your email: {user?.email || 'unknown'}</p>
                <p className="text-yellow-700">Your ID: {user?.id || 'unknown'}</p>
                <p className="text-yellow-700">Conflicts in state: {conflicts?.length || 0}</p>
                <p className="text-yellow-700">Your conflicts (filtered): {userConflicts?.length || 0}</p>
                
                {debugInfo && (
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <p className="font-bold text-yellow-800">Storage Debug:</p>
                    <p className="text-yellow-700">Backend: {debugInfo.backend || 'unknown'}</p>
                    <p className="text-yellow-700">Backend available: {debugInfo.backendAvailable ? '✅ YES' : '❌ NO'}</p>
                    <p className="text-yellow-700">Keys found: {debugInfo.keyCount ?? 'error'}</p>
                    {debugInfo.keys && debugInfo.keys.length > 0 && (
                      <p className="text-yellow-700">First keys: {debugInfo.keys.join(', ')}</p>
                    )}
                    {debugInfo.error && (
                      <p className="text-red-600">Error: {debugInfo.error}</p>
                    )}
                  </div>
                )}
                
                {conflicts?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <p className="font-bold text-yellow-800">All loaded conflicts:</p>
                    {conflicts.map((c, i) => (
                      <div key={i} className="mt-1 p-2 bg-white rounded border border-yellow-200">
                        <p className="font-medium">{c.title || 'No title'}</p>
                        <p>Mentee emails: {c.mentees?.map(m => m.email).join(', ') || 'none'}</p>
                        <p>Your email match: {c.mentees?.some(m => m.email?.toLowerCase() === user?.email?.toLowerCase()) ? '✅ YES' : '❌ NO'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    orange: 'from-orange-500 to-amber-600',
    green: 'from-emerald-500 to-teal-600',
    blue: 'from-blue-500 to-indigo-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-xl p-3 sm:p-6 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-2 sm:p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white mb-2 sm:mb-4`}>
        {icon}
      </div>
      <div className="text-xl sm:text-3xl font-light text-stone-800 mb-1">{value}</div>
      <div className="text-xs sm:text-sm text-stone-500 font-light">{label}</div>
    </div>
  );
}

// Conflict Card Component
function ConflictCard({ conflict, onClick }) {
  const statusColors = {
    'pending-acceptance': 'bg-yellow-100 text-yellow-700',
    'changes-proposed': 'bg-orange-100 text-orange-700',
    'created': 'bg-blue-100 text-blue-700',
    'identify-define': 'bg-purple-100 text-purple-700',
    'communicate': 'bg-orange-100 text-orange-700',
    'explore-alternatives': 'bg-amber-100 text-amber-700',
    'evaluate-select': 'bg-yellow-100 text-yellow-700',
    'agree-implement': 'bg-teal-100 text-teal-700',
    'follow-up': 'bg-cyan-100 text-cyan-700',
    'resolved': 'bg-green-100 text-green-700'
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 sm:p-6 border border-stone-200 hover:border-amber-300 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
    >
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-stone-800 group-hover:text-amber-600 transition-colors mb-2 break-words">
            {conflict.title}
          </h3>
          <p className="text-stone-600 text-sm line-clamp-2 break-words">{conflict.problemStatement?.what || 'No description'}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[conflict.status] || 'bg-stone-100 text-stone-700'}`}>
          {(conflict.status || 'pending').replace('-', ' ')}
        </span>
        <div className="flex items-center gap-1 text-stone-500 text-sm">
          <Users className="w-4 h-4 flex-shrink-0" />
          <span>{conflict.mentees?.length || 0} mentees</span>
        </div>
        <div className="flex items-center gap-1 text-stone-500 text-sm">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{new Date(conflict.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

// Create Conflict View Component
function CreateConflictView({ user, onBack, onCreated }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    model: 'personal',
    who: '',
    what: '',
    where: '',
    when: '',
    how: '',
    desiredOutcome: '',
    responseHours: '9-5',
    customStartHour: null,
    customEndHour: null,
    responseWaitTime: 15,
    responseWindow: 15,
    menteeEmails: ['']
  });

  const [errors, setErrors] = useState({});

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.model) newErrors.model = 'Model is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.who.trim()) newErrors.who = 'Who is required';
    if (!formData.what.trim()) newErrors.what = 'What is required';
    if (!formData.where.trim()) newErrors.where = 'Where is required';
    if (!formData.when.trim()) newErrors.when = 'When is required';
    if (!formData.how.trim()) newErrors.how = 'How is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.desiredOutcome.trim()) newErrors.desiredOutcome = 'Desired outcome is required';
    const validEmails = formData.menteeEmails.filter(e => e.trim() && e.includes('@'));
    if (validEmails.length < 1) newErrors.menteeEmails = 'At least one mentee email is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSubmit();
  };

  const handleSubmit = async () => {
    setSaving(true);
    console.log('Creating conflict...');
    
    try {
      const conflict = {
        id: `conflict-${Date.now()}`,
        title: formData.title,
        model: formData.model,
        problemStatement: {
          who: formData.who,
          what: formData.what,
          where: formData.where,
          when: formData.when,
          how: formData.how
        },
        desiredOutcome: formData.desiredOutcome,
        actualOutcome: '',
        status: 'pending-acceptance',
        statusHistory: [{ status: 'pending-acceptance', timestamp: new Date().toISOString() }],
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
        responseHours: formData.responseHours,
        responseWaitTime: formData.responseWaitTime,
        responseWindow: formData.responseWindow,
        termsAcceptance: {
          required: true,
          acceptedBy: [user.id], // Creator automatically accepts
          proposedChanges: {},
          status: 'pending'
        },
        mentees: formData.menteeEmails.filter(e => e.trim()).map((email, idx) => ({
          id: `mentee-${Date.now()}-${idx}`,
          email: email.toLowerCase(),
          name: email.split('@')[0],
          role: 'mentee',
          invited: true
        })),
        mentor: null,
        flyOnWall: null,
        omniscient: null,
        comments: [],
        steps: {
          identifyDefine: { completed: false, data: {} },
          communicate: { completed: false, cycles: [], acknowledged: false },
          exploreAlternatives: { completed: false, alternatives: [] },
          evaluateSelect: { completed: false, ratings: {}, selected: null },
          agreeImplement: { completed: false, acknowledged: [] },
          followUp: { completed: false, ratings: {} }
        }
      };

      console.log('Conflict object created:', conflict);
      const saved = await storage.set(`conflict:${conflict.id}`, conflict);
      console.log('Conflict saved to storage:', saved);
      
      if (saved) {
        console.log('Conflict successfully saved');
        
        // Send invitation emails to all mentees
        const emailPromises = formData.menteeEmails
          .filter(e => e.trim() && e.includes('@'))
          .map(async (toEmail) => {
            try {
              const result = await emailService.sendInvitation({
                toEmail,
                inviterName: user.name,
                inviterEmail: user.email,
                conflictTitle: formData.title,
                conflictId: conflict.id,
                conflictDescription: formData.what
              });
              console.log(`Email invitation sent to ${toEmail}:`, result);
              return { email: toEmail, success: result.success, result };
            } catch (error) {
              console.error(`Failed to send email to ${toEmail}:`, error);
              return { email: toEmail, success: false, error };
            }
          });

        // Wait for all emails to be sent (but don't block on failures)
        const emailResults = await Promise.allSettled(emailPromises);
        console.log('Email sending results:', emailResults);
        
        // Update conflict with email sent timestamps
        const updatedMentees = conflict.mentees.map(mentee => {
          const emailResult = emailResults.find(r => 
            r.status === 'fulfilled' && r.value.email.toLowerCase() === mentee.email.toLowerCase()
          );
          if (emailResult && emailResult.value.success) {
            return {
              ...mentee,
              lastEmailSent: new Date().toISOString(),
              emailSentCount: 1
            };
          }
          return mentee;
        });
        
        // Save updated conflict with email timestamps
        const conflictWithEmailInfo = { ...conflict, mentees: updatedMentees };
        await storage.set(`conflict:${conflict.id}`, conflictWithEmailInfo);
        
        // Show summary if emails were configured
        if (EMAIL_CONFIG.enabled) {
          const successCount = emailResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
          const totalCount = emailResults.length;
          if (successCount < totalCount) {
            alert(`Conflict created! ${successCount} of ${totalCount} invitation emails sent successfully.`);
          }
        } else {
          // Show invitation links for manual sharing
          const inviteLink = `${window.location.origin}?invite=${conflict.id}`;
          console.log('Invitation link (email not configured):', inviteLink);
        }
        
        console.log('Calling onCreated');
        onCreated();
      } else {
        console.error('Failed to save conflict');
        alert('Failed to save conflict. Please try again.');
        setSaving(false);
      }
    } catch (error) {
      console.error('Error creating conflict:', error);
      alert('An error occurred while creating the conflict. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border border-stone-200">
          <h2 className="text-2xl sm:text-3xl font-light text-stone-800 mb-6 sm:mb-8">Create New Conflict</h2>

          {/* Progress Indicator */}
          <div className="flex items-center gap-4 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  s === step ? 'bg-amber-600 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-stone-200 text-stone-500'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div className={`flex-1 h-1 mx-2 ${s < step ? 'bg-green-500' : 'bg-stone-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Conflict Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.title ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="Brief title for this conflict"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Model Type *
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="personal">Personal (couples, family, friends)</option>
                  <option value="professional">Professional (corporate conflicts)</option>
                  <option value="court-ordered">Court-ordered (divorcing parents)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Response Hours
                  </label>
                  <select
                    value={formData.responseHours === '9-5' || formData.responseHours === '5-9' || formData.responseHours === '24' ? formData.responseHours : 'custom'}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setFormData({ ...formData, responseHours: 'custom', customStartHour: 9, customEndHour: 17 });
                      } else {
                        setFormData({ ...formData, responseHours: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="9-5">9am - 5pm</option>
                    <option value="5-9">5pm - 9pm</option>
                    <option value="24">24 hours</option>
                    <option value="custom">Custom hours...</option>
                  </select>
                  
                  {/* Custom Hours Input */}
                  {(formData.responseHours === 'custom' || (!['9-5', '5-9', '24'].includes(formData.responseHours))) && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-800 font-medium mb-2">Enter custom hours</p>
                      <div className="space-y-2">
                        {/* Start Time */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-700 w-12">From:</span>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={(() => {
                              const hour = formData.customStartHour !== null ? formData.customStartHour : parseInt(formData.responseHours.split('-')[0]) || 9;
                              return hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            })()}
                            onChange={(e) => {
                              let hour12 = parseInt(e.target.value);
                              if (hour12 < 1) hour12 = 1;
                              if (hour12 > 12) hour12 = 12;
                              const currentHour = formData.customStartHour !== null ? formData.customStartHour : parseInt(formData.responseHours.split('-')[0]) || 9;
                              const isPM = currentHour >= 12;
                              const hour24 = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
                              const end = formData.customEndHour !== null ? formData.customEndHour : parseInt(formData.responseHours.split('-')[1]) || 17;
                              setFormData({ ...formData, customStartHour: hour24, customEndHour: end, responseHours: `${hour24}-${end}` });
                            }}
                            className="w-14 px-2 py-1 border border-amber-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <select
                            value={(() => {
                              const hour = formData.customStartHour !== null ? formData.customStartHour : parseInt(formData.responseHours.split('-')[0]) || 9;
                              return hour >= 12 ? 'PM' : 'AM';
                            })()}
                            onChange={(e) => {
                              const currentHour = formData.customStartHour !== null ? formData.customStartHour : parseInt(formData.responseHours.split('-')[0]) || 9;
                              const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
                              const isPM = e.target.value === 'PM';
                              const hour24 = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
                              const end = formData.customEndHour !== null ? formData.customEndHour : parseInt(formData.responseHours.split('-')[1]) || 17;
                              setFormData({ ...formData, customStartHour: hour24, customEndHour: end, responseHours: `${hour24}-${end}` });
                            }}
                            className="w-16 px-2 py-1 border border-amber-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                        
                        {/* End Time */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-700 w-12">To:</span>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={(() => {
                              const hour = formData.customEndHour !== null ? formData.customEndHour : parseInt(formData.responseHours.split('-')[1]) || 17;
                              return hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            })()}
                            onChange={(e) => {
                              let hour12 = parseInt(e.target.value);
                              if (hour12 < 1) hour12 = 1;
                              if (hour12 > 12) hour12 = 12;
                              const currentHour = formData.customEndHour !== null ? formData.customEndHour : parseInt(formData.responseHours.split('-')[1]) || 17;
                              const isPM = currentHour >= 12;
                              const hour24 = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
                              const start = formData.customStartHour !== null ? formData.customStartHour : parseInt(formData.responseHours.split('-')[0]) || 9;
                              setFormData({ ...formData, customStartHour: start, customEndHour: hour24, responseHours: `${start}-${hour24}` });
                            }}
                            className="w-14 px-2 py-1 border border-amber-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <select
                            value={(() => {
                              const hour = formData.customEndHour !== null ? formData.customEndHour : parseInt(formData.responseHours.split('-')[1]) || 17;
                              return hour >= 12 ? 'PM' : 'AM';
                            })()}
                            onChange={(e) => {
                              const currentHour = formData.customEndHour !== null ? formData.customEndHour : parseInt(formData.responseHours.split('-')[1]) || 17;
                              const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
                              const isPM = e.target.value === 'PM';
                              const hour24 = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
                              const start = formData.customStartHour !== null ? formData.customStartHour : parseInt(formData.responseHours.split('-')[0]) || 9;
                              setFormData({ ...formData, customStartHour: start, customEndHour: hour24, responseHours: `${start}-${hour24}` });
                            }}
                            className="w-16 px-2 py-1 border border-amber-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 mt-2">
                        Example: 9 AM to 5 PM, or 5 PM to 9 PM
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Wait Time (min)
                  </label>
                  <select
                    value={formData.responseWaitTime}
                    onChange={(e) => setFormData({ ...formData, responseWaitTime: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Response Window (min)
                  </label>
                  <select
                    value={formData.responseWindow}
                    onChange={(e) => setFormData({ ...formData, responseWindow: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Problem Statement */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-stone-600 mb-4">
                Define the conflict using the Who, What, Where, When, and How framework.
              </p>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Who is involved? *
                </label>
                <input
                  type="text"
                  value={formData.who}
                  onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.who ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="Who are the parties involved?"
                />
                {errors.who && <p className="text-red-500 text-sm mt-1">{errors.who}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  What is the conflict? *
                </label>
                <div className="relative">
                  <textarea
                    value={formData.what}
                    onChange={(e) => setFormData({ ...formData, what: e.target.value })}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.what ? 'border-red-500' : 'border-stone-300'
                    }`}
                    placeholder="What is the issue?"
                    rows={3}
                  />
                  <VoiceInputButton 
                    onResult={(text) => setFormData({ ...formData, what: formData.what + (formData.what ? ' ' : '') + text })}
                    className="absolute right-2 top-2"
                  />
                </div>
                {errors.what && <p className="text-red-500 text-sm mt-1">{errors.what}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Where did it occur? *
                </label>
                <input
                  type="text"
                  value={formData.where}
                  onChange={(e) => setFormData({ ...formData, where: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.where ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="Where did this happen?"
                />
                {errors.where && <p className="text-red-500 text-sm mt-1">{errors.where}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  When did it occur? *
                </label>
                <input
                  type="text"
                  value={formData.when}
                  onChange={(e) => setFormData({ ...formData, when: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.when ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="When did this happen?"
                />
                {errors.when && <p className="text-red-500 text-sm mt-1">{errors.when}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  How did it happen? *
                </label>
                <div className="relative">
                  <textarea
                    value={formData.how}
                    onChange={(e) => setFormData({ ...formData, how: e.target.value })}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.how ? 'border-red-500' : 'border-stone-300'
                    }`}
                    placeholder="How did this conflict arise?"
                    rows={3}
                  />
                  <VoiceInputButton 
                    onResult={(text) => setFormData({ ...formData, how: formData.how + (formData.how ? ' ' : '') + text })}
                    className="absolute right-2 top-2"
                  />
                </div>
                {errors.how && <p className="text-red-500 text-sm mt-1">{errors.how}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Participants & Outcome */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Desired Outcome *
                </label>
                <div className="relative">
                  <textarea
                    value={formData.desiredOutcome}
                    onChange={(e) => setFormData({ ...formData, desiredOutcome: e.target.value })}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      errors.desiredOutcome ? 'border-red-500' : 'border-stone-300'
                    }`}
                    placeholder="What would an ideal resolution look like?"
                    rows={4}
                  />
                  <VoiceInputButton 
                    onResult={(text) => setFormData({ ...formData, desiredOutcome: formData.desiredOutcome + (formData.desiredOutcome ? ' ' : '') + text })}
                    className="absolute right-2 top-2"
                  />
                </div>
                {errors.desiredOutcome && <p className="text-red-500 text-sm mt-1">{errors.desiredOutcome}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Invite Mentees * (at least 1 required)
                </label>
                {formData.menteeEmails.map((email, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const newEmails = [...formData.menteeEmails];
                        newEmails[idx] = e.target.value;
                        setFormData({ ...formData, menteeEmails: newEmails });
                      }}
                      className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="mentee@example.com"
                    />
                    {formData.menteeEmails.length > 1 && (
                      <button
                        onClick={() => {
                          const newEmails = formData.menteeEmails.filter((_, i) => i !== idx);
                          setFormData({ ...formData, menteeEmails: newEmails });
                        }}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                {formData.menteeEmails.length < 6 && (
                  <button
                    onClick={() => setFormData({ ...formData, menteeEmails: [...formData.menteeEmails, ''] })}
                    className="text-amber-600 hover:text-amber-700 text-sm font-medium mt-2"
                  >
                    + Add another mentee
                  </button>
                )}
                {errors.menteeEmails && <p className="text-red-500 text-sm mt-1">{errors.menteeEmails}</p>}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={saving}
              className={`px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                step === 1 ? 'ml-auto' : ''
              }`}
            >
              {saving ? 'Creating...' : step === 3 ? 'Create Conflict' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Review Proposed Changes View Component
function ReviewProposedChangesView({ conflict, user, onBack, onUpdate }) {
  const [responding, setResponding] = useState(false);
  const [counterProposing, setCounterProposing] = useState(false);
  const [counterHours, setCounterHours] = useState(conflict.responseHours);
  const [counterWaitTime, setCounterWaitTime] = useState(conflict.responseWaitTime);
  const [counterWindow, setCounterWindow] = useState(conflict.responseWindow);

  const proposedChanges = conflict.termsAcceptance?.proposedChanges;

  const handleAcceptProposal = async () => {
    setResponding(true);
    try {
      const updated = {
        ...conflict,
        responseHours: proposedChanges.responseHours,
        responseWaitTime: proposedChanges.responseWaitTime,
        responseWindow: proposedChanges.responseWindow,
        termsAcceptance: {
          ...conflict.termsAcceptance,
          status: 'accepted',
          acceptedBy: [...(conflict.termsAcceptance.acceptedBy || []), proposedChanges.proposedBy]
        },
        status: 'identify-define',
        statusHistory: [
          ...conflict.statusHistory,
          { status: 'identify-define', timestamp: new Date().toISOString() }
        ],
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      await storage.set(`conflict:${conflict.id}`, updated);
      onUpdate();
    } catch (error) {
      console.error('Error accepting proposal:', error);
      alert('Failed to accept proposal. Please try again.');
    }
    setResponding(false);
  };

  const handleCounterPropose = async () => {
    setResponding(true);
    try {
      const updated = {
        ...conflict,
        responseHours: counterHours,
        responseWaitTime: counterWaitTime,
        responseWindow: counterWindow,
        termsAcceptance: {
          ...conflict.termsAcceptance,
          proposedChanges: {
            proposedBy: user.id,
            proposedByName: user.name,
            responseHours: counterHours,
            responseWaitTime: counterWaitTime,
            responseWindow: counterWindow,
            timestamp: new Date().toISOString(),
            isCounterProposal: true
          },
          status: 'pending'
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      await storage.set(`conflict:${conflict.id}`, updated);
      onUpdate();
    } catch (error) {
      console.error('Error counter-proposing:', error);
      alert('Failed to submit counter-proposal. Please try again.');
    }
    setResponding(false);
  };

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border border-stone-200">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-stone-800 mb-2">Review Proposed Changes</h2>
            <p className="text-stone-600">
              {proposedChanges?.proposedByName} has proposed different terms
            </p>
          </div>

          {/* Conflict Info */}
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-stone-50 rounded-xl">
            <h3 className="font-medium text-stone-800 mb-2">Conflict: {conflict.title}</h3>
            <p className="text-stone-600">{conflict.problemStatement?.what || 'No description'}</p>
          </div>

          {/* Comparison */}
          <div className="mb-6 sm:mb-8">
            <h3 className="font-medium text-stone-800 mb-4">Proposed Changes</h3>
            
            <div className="space-y-4">
              {/* Response Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-lg border-2 border-stone-200">
                  <div className="text-xs text-stone-500 mb-1">Your Original</div>
                  <div className="text-sm font-medium text-stone-600">Response Hours</div>
                  <div className="text-lg font-medium text-stone-800 mt-1">{conflict.responseHours}</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <div className="text-xs text-orange-600 mb-1">Their Proposal</div>
                  <div className="text-sm font-medium text-orange-700">Response Hours</div>
                  <div className="text-lg font-medium text-orange-800 mt-1">{proposedChanges?.responseHours}</div>
                </div>
              </div>

              {/* Wait Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-lg border-2 border-stone-200">
                  <div className="text-xs text-stone-500 mb-1">Your Original</div>
                  <div className="text-sm font-medium text-stone-600">Wait Time</div>
                  <div className="text-lg font-medium text-stone-800 mt-1">{conflict.responseWaitTime} min</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <div className="text-xs text-orange-600 mb-1">Their Proposal</div>
                  <div className="text-sm font-medium text-orange-700">Wait Time</div>
                  <div className="text-lg font-medium text-orange-800 mt-1">{proposedChanges?.responseWaitTime} min</div>
                </div>
              </div>

              {/* Response Window */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-lg border-2 border-stone-200">
                  <div className="text-xs text-stone-500 mb-1">Your Original</div>
                  <div className="text-sm font-medium text-stone-600">Response Window</div>
                  <div className="text-lg font-medium text-stone-800 mt-1">{conflict.responseWindow} min</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <div className="text-xs text-orange-600 mb-1">Their Proposal</div>
                  <div className="text-sm font-medium text-orange-700">Response Window</div>
                  <div className="text-lg font-medium text-orange-800 mt-1">{proposedChanges?.responseWindow} min</div>
                </div>
              </div>
            </div>
          </div>

          {!counterProposing ? (
            <div className="space-y-4">
              <button
                onClick={handleAcceptProposal}
                disabled={responding}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {responding ? 'Accepting...' : 'Accept Their Proposal'}
              </button>
              <button
                onClick={() => setCounterProposing(true)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Make Counter-Proposal
              </button>
              <button
                onClick={onBack}
                className="w-full bg-stone-200 hover:bg-stone-300 text-stone-700 py-3 rounded-lg font-medium transition-colors"
              >
                Decide Later
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="font-medium text-stone-800">Make Your Counter-Proposal</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Response Hours
                  </label>
                  <select
                    value={counterHours}
                    onChange={(e) => setCounterHours(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="9-5">9am - 5pm</option>
                    <option value="5-9">5pm - 9pm</option>
                    <option value="24">24 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Wait Time (min)
                  </label>
                  <select
                    value={counterWaitTime}
                    onChange={(e) => setCounterWaitTime(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Window (min)
                  </label>
                  <select
                    value={counterWindow}
                    onChange={(e) => setCounterWindow(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCounterPropose}
                  disabled={responding}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {responding ? 'Submitting...' : 'Submit Counter-Proposal'}
                </button>
                <button
                  onClick={() => setCounterProposing(false)}
                  className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Terms Acceptance View Component
function TermsAcceptanceView({ conflict, user, onBack, onUpdate }) {
  const [accepting, setAccepting] = useState(false);
  const [proposingChanges, setProposingChanges] = useState(false);
  const [proposedHours, setProposedHours] = useState(conflict.responseHours);
  const [proposedWaitTime, setProposedWaitTime] = useState(conflict.responseWaitTime);
  const [proposedWindow, setProposedWindow] = useState(conflict.responseWindow);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const updated = {
        ...conflict,
        termsAcceptance: {
          ...conflict.termsAcceptance,
          acceptedBy: [...(conflict.termsAcceptance.acceptedBy || []), user.id]
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      // Check if all mentees have accepted
      const allMenteeIds = conflict.mentees.map(m => m.id).filter(id => id);
      const allMenteesAccepted = allMenteeIds.every(id => 
        updated.termsAcceptance.acceptedBy.includes(id)
      );

      if (allMenteesAccepted || conflict.mentees.length === 1) {
        updated.termsAcceptance.status = 'accepted';
        updated.status = 'identify-define';
        updated.statusHistory.push({ 
          status: 'identify-define', 
          timestamp: new Date().toISOString() 
        });
      }

      await storage.set(`conflict:${conflict.id}`, updated);
      onUpdate();
    } catch (error) {
      console.error('Error accepting terms:', error);
      alert('Failed to accept terms. Please try again.');
    }
    setAccepting(false);
  };

  const handleProposeChanges = async () => {
    setAccepting(true);
    try {
      const updated = {
        ...conflict,
        termsAcceptance: {
          ...conflict.termsAcceptance,
          proposedChanges: {
            proposedBy: user.id,
            proposedByName: user.name,
            responseHours: proposedHours,
            responseWaitTime: proposedWaitTime,
            responseWindow: proposedWindow,
            timestamp: new Date().toISOString()
          },
          status: 'changes-proposed'
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      await storage.set(`conflict:${conflict.id}`, updated);
      onUpdate();
    } catch (error) {
      console.error('Error proposing changes:', error);
      alert('Failed to propose changes. Please try again.');
    }
    setAccepting(false);
  };

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border border-stone-200">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-stone-800 mb-2">Terms Acceptance</h2>
            <p className="text-stone-600">Please review and accept the conflict resolution terms</p>
          </div>

          {/* Conflict Info */}
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-stone-50 rounded-xl">
            <h3 className="font-medium text-stone-800 mb-4">Conflict: {conflict.title}</h3>
            <p className="text-stone-600 mb-4">{conflict.problemStatement?.what || 'No description'}</p>
            <div className="text-sm text-stone-500">
              Created by: {conflict.mentees?.find(m => m.id === conflict.createdBy)?.name || 'Conflict creator'}
            </div>
          </div>

          {/* Current Terms */}
          <div className="mb-6 sm:mb-8">
            <h3 className="font-medium text-stone-800 mb-4">Proposed Response Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg">
                <div className="text-sm text-stone-500 mb-1">Response Hours</div>
                <div className="text-lg font-medium text-stone-800">{conflict.responseHours}</div>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg">
                <div className="text-sm text-stone-500 mb-1">Wait Time</div>
                <div className="text-lg font-medium text-stone-800">{conflict.responseWaitTime} min</div>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg">
                <div className="text-sm text-stone-500 mb-1">Response Window</div>
                <div className="text-lg font-medium text-stone-800">{conflict.responseWindow} min</div>
              </div>
            </div>
          </div>

          {!proposingChanges ? (
            <div className="space-y-4">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {accepting ? 'Accepting...' : 'Accept These Terms'}
              </button>
              <button
                onClick={() => setProposingChanges(true)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Propose Different Terms
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="font-medium text-stone-800">Propose Your Preferred Settings</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Response Hours
                  </label>
                  <select
                    value={proposedHours}
                    onChange={(e) => setProposedHours(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="9-5">9am - 5pm</option>
                    <option value="5-9">5pm - 9pm</option>
                    <option value="24">24 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Wait Time (min)
                  </label>
                  <select
                    value={proposedWaitTime}
                    onChange={(e) => setProposedWaitTime(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Window (min)
                  </label>
                  <select
                    value={proposedWindow}
                    onChange={(e) => setProposedWindow(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleProposeChanges}
                  disabled={accepting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {accepting ? 'Proposing...' : 'Submit Proposal'}
                </button>
                <button
                  onClick={() => setProposingChanges(false)}
                  className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Conflict Detail View Component
function ConflictDetailView({ conflict, user, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('overview');

  const canEdit = conflict.mentees?.some(m => m.id === user.id || m.email.toLowerCase() === user.email.toLowerCase()) ||
                  conflict.mentor?.id === user.id ||
                  user.role === 'admin';

  // Check if user needs to accept terms
  const needsToAcceptTerms = conflict.termsAcceptance?.required && 
                             conflict.termsAcceptance?.status === 'pending' &&
                             !conflict.termsAcceptance?.acceptedBy?.includes(user.id) &&
                             conflict.createdBy !== user.id;

  // Check if user is creator and there are proposed changes to review
  const needsToReviewChanges = conflict.termsAcceptance?.status === 'changes-proposed' &&
                                conflict.createdBy === user.id;

  if (needsToAcceptTerms) {
    return <TermsAcceptanceView conflict={conflict} user={user} onBack={onBack} onUpdate={onUpdate} />;
  }

  if (needsToReviewChanges) {
    return <ReviewProposedChangesView conflict={conflict} user={user} onBack={onBack} onUpdate={onUpdate} />;
  }

  return (
    <div className="min-h-screen p-2 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-4 sm:mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 sm:p-8 text-white">
            <h1 className="text-xl sm:text-3xl font-light mb-2 break-words">{conflict.title}</h1>
            <p className="text-amber-100 mb-4 text-sm sm:text-base break-words">{conflict.problemStatement?.what || 'No description'}</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                {(conflict.status || 'pending').replace('-', ' ')}
              </span>
              <span>Created {new Date(conflict.createdAt).toLocaleDateString()}</span>
              <span className="capitalize">{conflict.model} model</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-stone-200 bg-stone-50">
            <div className="flex gap-1 p-2">
              {['overview', 'process', 'history'].map(tab => (
                <button
                  key={tab}
                  data-tab={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors capitalize text-sm sm:text-base ${
                    activeTab === tab
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-stone-600 hover:bg-white/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-8">
            {activeTab === 'overview' && (
              <ConflictOverview conflict={conflict} user={user} onUpdate={onUpdate} />
            )}
            {activeTab === 'process' && (
              <ConflictProcess conflict={conflict} user={user} canEdit={canEdit} onUpdate={onUpdate} />
            )}
            {activeTab === 'history' && (
              <ConflictHistory conflict={conflict} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Conflict Overview Component
function ConflictOverview({ conflict, user, onUpdate }) {
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [resendingEmails, setResendingEmails] = useState(false);
  const [removingMentee, setRemovingMentee] = useState(null);

  // Check if user can remove a specific mentee
  // - Mentor can remove any mentee at any stage
  // - Creator/Admin can only remove mentees who have NOT yet accepted
  const canRemoveMentee = (mentee) => {
    const isCreator = conflict.createdBy === user.id;
    const isMentor = conflict.mentor?.id === user.id;
    const isAdmin = user.role === 'admin';
    const isMenteeCreator = mentee.id === conflict.createdBy;
    
    // Can never remove the conflict creator
    if (isMenteeCreator) return false;
    
    // Mentor can always remove any mentee
    if (isMentor) return true;
    
    // Check if this specific mentee has accepted
    const menteeHasAccepted = conflict.termsAcceptance?.acceptedBy?.includes(mentee.id);
    
    // Creator and Admin can only remove if mentee hasn't accepted yet
    if ((isCreator || isAdmin) && !menteeHasAccepted) {
      return true;
    }
    
    return false;
  };

  // Handle removing a mentee from the conflict
  const handleRemoveMentee = async (menteeToRemove) => {
    const isMenteeCreator = menteeToRemove.id === conflict.createdBy;
    
    if (isMenteeCreator) {
      alert("Cannot remove the conflict creator.");
      return;
    }

    // Check if this mentee has already accepted/responded
    const hasAccepted = conflict.termsAcceptance?.acceptedBy?.includes(menteeToRemove.id);
    const isMentor = conflict.mentor?.id === user.id;
    
    // Only mentor can remove after acceptance
    if (hasAccepted && !isMentor) {
      alert("Only the mentor can remove a mentee who has already accepted the terms.");
      return;
    }

    const confirmMsg = hasAccepted
      ? `"${menteeToRemove.name || menteeToRemove.email}" has already accepted the terms. Are you sure you want to remove them?`
      : `Are you sure you want to remove "${menteeToRemove.name || menteeToRemove.email}" from this conflict?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setRemovingMentee(menteeToRemove.id);
    try {
      // Remove mentee from the list
      const updatedMentees = conflict.mentees.filter(m => m.id !== menteeToRemove.id);
      
      console.log('=== REMOVE MENTEE DEBUG ===');
      console.log('Original mentees:', conflict.mentees);
      console.log('Removing:', menteeToRemove);
      console.log('Updated mentees:', updatedMentees);
      
      // Also remove from termsAcceptance.acceptedBy if present
      const updatedAcceptedBy = conflict.termsAcceptance?.acceptedBy?.filter(
        id => id !== menteeToRemove.id
      ) || [];

      const updatedConflict = {
        ...conflict,
        mentees: updatedMentees,
        termsAcceptance: {
          ...conflict.termsAcceptance,
          acceptedBy: updatedAcceptedBy
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      console.log('Saving updated conflict:', updatedConflict);
      console.log('Conflict ID:', conflict.id);
      
      const saveResult = await storage.set(`conflict:${conflict.id}`, updatedConflict, true);
      console.log('Save result:', saveResult);
      
      // Verify the save by reading it back
      const verification = await storage.get(`conflict:${conflict.id}`, true);
      console.log('Verification read:', verification);
      console.log('Verified mentees count:', verification?.mentees?.length);
      console.log('=== END REMOVE MENTEE DEBUG ===');
      
      await onUpdate();
      
      alert(`"${menteeToRemove.name || menteeToRemove.email}" has been removed from the conflict.`);
    } catch (error) {
      console.error('Error removing mentee:', error);
      alert('Failed to remove participant. Please try again.');
    } finally {
      setRemovingMentee(null);
    }
  };

  // Check if resend is available (30 minutes after last send)
  const canResendEmails = () => {
    if (conflict.createdBy !== user.id) return false; // Only creator can resend
    
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    // Find mentees who haven't responded and whose last email was sent > 30 min ago
    const menteesNeedingResend = conflict.mentees?.filter(mentee => {
      // Skip if this is the creator
      if (mentee.id === conflict.createdBy) return false;
      
      // Check if they've responded (accepted terms or participated)
      const hasResponded = conflict.termsAcceptance?.acceptedBy?.includes(mentee.id) ||
                          conflict.steps?.identifyDefine?.data?.[mentee.id];
      
      if (hasResponded) return false;
      
      // Check if 30 minutes have passed since last email
      if (!mentee.lastEmailSent) return true; // Never sent, can send now
      
      const lastSent = new Date(mentee.lastEmailSent);
      return lastSent < thirtyMinutesAgo;
    }) || [];
    
    return menteesNeedingResend.length > 0;
  };

  const handleResendEmails = async () => {
    setResendingEmails(true);
    
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      // Find mentees who need resend
      const menteesToResend = conflict.mentees?.filter(mentee => {
        if (mentee.id === conflict.createdBy) return false;
        
        const hasResponded = conflict.termsAcceptance?.acceptedBy?.includes(mentee.id) ||
                            conflict.steps?.identifyDefine?.data?.[mentee.id];
        
        if (hasResponded) return false;
        
        if (!mentee.lastEmailSent) return true;
        
        const lastSent = new Date(mentee.lastEmailSent);
        return lastSent < thirtyMinutesAgo;
      }) || [];

      if (menteesToResend.length === 0) {
        alert('No mentees need email resend at this time.');
        setResendingEmails(false);
        return;
      }

      // Send emails
      const emailPromises = menteesToResend.map(async (mentee) => {
        try {
          const result = await emailService.sendInvitation({
            toEmail: mentee.email,
            inviterName: user.name,
            inviterEmail: user.email,
            conflictTitle: conflict.title,
            conflictId: conflict.id,
            conflictDescription: conflict.problemStatement?.what
          });
          return { email: mentee.email, success: result.success };
        } catch (error) {
          console.error(`Failed to resend email to ${mentee.email}:`, error);
          return { email: mentee.email, success: false };
        }
      });

      const results = await Promise.allSettled(emailPromises);
      
      // Update mentee records with new send time
      const updatedMentees = conflict.mentees.map(mentee => {
        const result = results.find(r => 
          r.status === 'fulfilled' && r.value.email.toLowerCase() === mentee.email.toLowerCase()
        );
        if (result && result.value.success) {
          return {
            ...mentee,
            lastEmailSent: new Date().toISOString(),
            emailSentCount: (mentee.emailSentCount || 1) + 1
          };
        }
        return mentee;
      });

      // Save updated conflict
      const updatedConflict = { ...conflict, mentees: updatedMentees };
      await storage.set(`conflict:${conflict.id}`, updatedConflict);
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      alert(`Resent ${successCount} of ${menteesToResend.length} invitation emails.`);
      
      await onUpdate();
    } catch (error) {
      console.error('Error resending emails:', error);
      alert('Failed to resend emails. Please try again.');
    }
    
    setResendingEmails(false);
  };

  const getNextAction = () => {
    // Handle conflicts created before terms acceptance was added
    if (!conflict.termsAcceptance || conflict.termsAcceptance.status === 'accepted' || conflict.status !== 'pending-acceptance') {
      // Skip terms acceptance checks for older conflicts
    } else {
      // Check if user needs to accept terms
      const needsToAcceptTerms = conflict.termsAcceptance?.required && 
                                 conflict.termsAcceptance?.status === 'pending' &&
                                 !conflict.termsAcceptance?.acceptedBy?.includes(user.id) &&
                                 conflict.createdBy !== user.id;
      
      if (needsToAcceptTerms) {
        return {
          text: 'Review & Accept Terms',
          description: 'You need to accept the conflict resolution terms before proceeding',
          color: 'yellow',
          action: 'terms'
        };
      }

      // Check if there are proposed changes to review
      const needsToReviewChanges = conflict.termsAcceptance?.status === 'changes-proposed' &&
                                    conflict.createdBy === user.id;
      
      if (needsToReviewChanges) {
        return {
          text: 'Review Proposed Changes',
          description: `${conflict.termsAcceptance?.proposedChanges?.proposedByName} has proposed different terms`,
          color: 'orange',
          action: 'review-changes'
        };
      }

      // Check if waiting for others to accept
      if (conflict.termsAcceptance?.status === 'pending' && conflict.termsAcceptance?.acceptedBy?.includes(user.id)) {
        return {
          text: 'Waiting for Others',
          description: 'Waiting for all parties to accept the terms',
          color: 'blue',
          action: 'waiting'
        };
      }
    }

    // Check current step and what's needed
    const isMentee = conflict.mentees?.some(m => m.id === user.id || m.email.toLowerCase() === user.email.toLowerCase());
    const isCreator = conflict.createdBy === user.id;
    const canParticipate = isMentee || isCreator;
    
    if (conflict.status === 'identify-define' || conflict.status === 'created') {
      const userResponse = conflict.steps?.identifyDefine?.data?.[user.id];
      if (!userResponse && canParticipate) {
        return {
          text: 'Submit Your Understanding',
          description: 'Paraphrase the problem statement to show your understanding',
          color: 'purple',
          action: 'process'
        };
      }
      
      const responseCount = Object.keys(conflict.steps?.identifyDefine?.data || {}).length;
      const totalMentees = conflict.mentees?.length || 1;
      const allResponded = responseCount >= totalMentees;
      
      if (allResponded && !conflict.steps?.identifyDefine?.resolutionCheck && canParticipate) {
        return {
          text: 'Resolution Check',
          description: 'Decide if the conflict can be resolved at this stage',
          color: 'purple',
          action: 'process'
        };
      }
      
      if (userResponse && !allResponded) {
        return {
          text: 'Waiting for Responses',
          description: `${responseCount} of ${totalMentees} participants have responded`,
          color: 'blue',
          action: 'waiting'
        };
      }
    }

    if (conflict.status === 'communicate') {
      const cycles = conflict.steps?.communicate?.cycles || [];
      const lastCycle = cycles[cycles.length - 1];
      
      // User is waiting for other person to paraphrase their statement
      if (lastCycle && !lastCycle.paraphrase && lastCycle.userId === user.id) {
        return {
          text: 'Awaiting Paraphrase',
          description: 'Waiting for the other participant to paraphrase your statement',
          color: 'blue',
          action: 'waiting'
        };
      }
      
      // User needs to paraphrase the other person's statement
      if (lastCycle && !lastCycle.paraphrase && lastCycle.userId !== user.id && canParticipate) {
        return {
          text: 'Paraphrase Response',
          description: 'Show understanding by paraphrasing the last statement',
          color: 'orange',
          action: 'process'
        };
      }
      
      // User can add their own statement
      if ((!lastCycle || lastCycle.paraphrase) && cycles.length < 5 && canParticipate) {
        return {
          text: 'Share Your Perspective',
          description: 'Add a "Because" statement to communicate your perspective',
          color: 'orange',
          action: 'process'
        };
      }
      
      if (cycles.length >= 5) {
        return {
          text: 'Communication Complete',
          description: 'Ready to move to exploring alternatives',
          color: 'green',
          action: 'waiting'
        };
      }
    }

    if (conflict.status === 'explore-alternatives') {
      const alternatives = conflict.steps?.exploreAlternatives?.alternatives || [];
      const userAlternatives = alternatives.filter(a => a.createdBy === user.id);
      
      if (userAlternatives.length < 3 && canParticipate) {
        return {
          text: 'Propose Solutions',
          description: `You can propose up to ${3 - userAlternatives.length} more alternative${3 - userAlternatives.length !== 1 ? 's' : ''}`,
          color: 'amber',
          action: 'process'
        };
      }
      
      if (userAlternatives.length >= 3) {
        return {
          text: 'Proposals Submitted',
          description: 'You have submitted all your alternatives',
          color: 'blue',
          action: 'waiting'
        };
      }
    }

    if (conflict.status === 'evaluate-select') {
      const hasRated = conflict.steps?.evaluateSelect?.ratings?.[user.id];
      
      if (!hasRated && canParticipate) {
        return {
          text: 'Rate Solutions',
          description: 'Rate all proposed solutions to select the best one',
          color: 'yellow',
          action: 'process'
        };
      }
      
      return {
        text: 'Ratings Submitted',
        description: 'Waiting for all participants to submit their ratings',
        color: 'blue',
        action: 'waiting'
      };
    }

    if (conflict.status === 'agree-implement') {
      const hasAcknowledged = conflict.steps?.agreeImplement?.acknowledged?.find(a => a.userId === user.id);
      
      if (!hasAcknowledged && canParticipate) {
        return {
          text: 'Acknowledge Resolution',
          description: 'Review and acknowledge the selected resolution',
          color: 'green',
          action: 'process'
        };
      }
      
      return {
        text: 'Acknowledgment Submitted',
        description: 'Waiting for all participants to acknowledge the resolution',
        color: 'blue',
        action: 'waiting'
      };
    }

    if (conflict.status === 'follow-up') {
      const hasRated = conflict.steps?.followUp?.ratings?.[user.id];
      
      if (!hasRated && canParticipate) {
        return {
          text: 'Complete Follow-up',
          description: 'Rate your experience with the conflict resolution process',
          color: 'cyan',
          action: 'process'
        };
      }
      
      if (hasRated && !conflict.steps?.followUp?.completed) {
        return {
          text: 'Follow-up Submitted',
          description: 'Waiting for all participants to complete the follow-up',
          color: 'blue',
          action: 'waiting'
        };
      }
      
      return {
        text: 'View Summary',
        description: 'All ratings submitted. View the complete resolution summary',
        color: 'green',
        action: 'process'
      };
    }

    if (conflict.status === 'resolved') {
      return {
        text: 'Conflict Resolved',
        description: 'This conflict has been successfully resolved',
        color: 'green',
        action: 'none'
      };
    }

    // Default - view the process
    if (canParticipate) {
      return {
        text: 'View Process',
        description: 'Check the process tab to see the current status',
        color: 'blue',
        action: 'process'
      };
    }

    return null;
  };

  const handleAddParticipant = async () => {
    if (!newParticipantEmail.trim() || !newParticipantEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    // Check if already a participant
    const alreadyExists = conflict.mentees?.some(m => 
      m.email?.toLowerCase() === newParticipantEmail.toLowerCase()
    );
    
    if (alreadyExists) {
      alert('This person is already a participant');
      return;
    }

    setAddingParticipant(true);
    try {
      const newMentee = {
        id: `mentee-${Date.now()}`,
        email: newParticipantEmail.trim(),
        name: newParticipantEmail.split('@')[0],
        role: 'mentee',
        invited: true,
        addedAt: new Date().toISOString()
      };

      const updated = {
        ...conflict,
        mentees: [...(conflict.mentees || []), newMentee],
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      await storage.set(`conflict:${conflict.id}`, updated);
      
      // Send invitation email
      try {
        const emailResult = await emailService.sendInvitation({
          toEmail: newParticipantEmail.trim(),
          inviterName: user.name,
          inviterEmail: user.email,
          conflictTitle: conflict.title,
          conflictId: conflict.id,
          conflictDescription: conflict.problemStatement?.what
        });
        console.log('Invitation email sent:', emailResult);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't block on email failure
      }
      
      // Generate invite link for manual sharing
      const inviteLink = `${window.location.origin}?invite=${conflict.id}&email=${encodeURIComponent(newParticipantEmail.trim())}`;
      
      setNewParticipantEmail('');
      setShowAddParticipant(false);
      await onUpdate();
      
      if (EMAIL_CONFIG.enabled) {
        alert('Participant added and invitation email sent!');
      } else {
        // Show the invite link for manual sharing
        alert(`Participant added!\n\nShare this link with them:\n${inviteLink}`);
      }
    } catch (error) {
      console.error('Error adding participant:', error);
      alert('Failed to add participant. Please try again.');
    }
    setAddingParticipant(false);
  };

  const nextAction = getNextAction();

  return (
    <div className="space-y-8">
      {/* Next Action CTA */}
      {nextAction && (
        <div className={`p-4 sm:p-6 rounded-xl border-2 ${
          nextAction.color === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
          nextAction.color === 'orange' ? 'bg-orange-50 border-orange-300' :
          nextAction.color === 'blue' ? 'bg-blue-50 border-blue-300' :
          nextAction.color === 'purple' ? 'bg-purple-50 border-purple-300' :
          nextAction.color === 'amber' ? 'bg-amber-50 border-amber-300' :
          nextAction.color === 'green' ? 'bg-green-50 border-green-300' :
          'bg-stone-50 border-stone-300'
        }`}>
          <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <div className={`text-lg font-medium mb-1 ${
                nextAction.color === 'yellow' ? 'text-yellow-800' :
                nextAction.color === 'orange' ? 'text-orange-800' :
                nextAction.color === 'blue' ? 'text-blue-800' :
                nextAction.color === 'purple' ? 'text-purple-800' :
                nextAction.color === 'amber' ? 'text-amber-800' :
                nextAction.color === 'green' ? 'text-green-800' :
                'text-stone-800'
              }`}>
                {nextAction.text}
              </div>
              <p className={`text-sm ${
                nextAction.color === 'yellow' ? 'text-yellow-700' :
                nextAction.color === 'orange' ? 'text-orange-700' :
                nextAction.color === 'blue' ? 'text-blue-700' :
                nextAction.color === 'purple' ? 'text-purple-700' :
                nextAction.color === 'amber' ? 'text-amber-700' :
                nextAction.color === 'green' ? 'text-green-700' :
                'text-stone-700'
              }`}>
                {nextAction.description}
              </p>
            </div>
            {nextAction.action !== 'waiting' && nextAction.action !== 'none' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  // Switch to process tab
                  const processTab = document.querySelector('[data-tab="process"]');
                  if (processTab) processTab.click();
                }}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap text-center ${
                  nextAction.color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                  nextAction.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                  nextAction.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                  nextAction.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                  nextAction.color === 'amber' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                  nextAction.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  'bg-stone-600 hover:bg-stone-700 text-white'
                }`}
              >
                Take Action →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Problem Statement */}
      <div>
        <h3 className="text-lg sm:text-xl font-medium text-stone-800 mb-4">Problem Statement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <InfoCard label="Who" value={conflict.problemStatement.who} />
          <InfoCard label="What" value={conflict.problemStatement?.what || 'Not specified'} />
          <InfoCard label="Where" value={conflict.problemStatement.where} />
          <InfoCard label="When" value={conflict.problemStatement.when} />
          <InfoCard label="How" value={conflict.problemStatement.how} colSpan={2} />
        </div>
      </div>

      {/* Outcomes */}
      <div>
        <h3 className="text-lg sm:text-xl font-medium text-stone-800 mb-4">Outcomes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <InfoCard label="Desired Outcome" value={conflict.desiredOutcome} />
          <InfoCard 
            label="Actual Outcome" 
            value={conflict.actualOutcome || 'Not yet determined'} 
            className={!conflict.actualOutcome ? 'text-stone-400 italic' : ''}
          />
        </div>
      </div>

      {/* Participants */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg sm:text-xl font-medium text-stone-800">Participants</h3>
          <div className="flex flex-wrap gap-2">
            {canResendEmails() && (
              <button
                onClick={handleResendEmails}
                disabled={resendingEmails}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                {resendingEmails ? 'Sending...' : 'Resend Invites'}
              </button>
            )}
            <button
              onClick={() => {
                const inviteLink = `${window.location.origin}?invite=${conflict.id}`;
                navigator.clipboard.writeText(inviteLink);
                alert('Invite link copied to clipboard!\n\nShare this link with participants:\n' + inviteLink);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-600 hover:bg-stone-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              Copy Invite Link
            </button>
            <button
              onClick={() => setShowAddParticipant(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Participant
            </button>
          </div>
        </div>
        {/* Debug info */}
        <div className="text-xs text-stone-500 mb-2">
          Total mentees: {conflict.mentees?.length || 0}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {conflict.mentees?.map((mentee, idx) => {
            // Check if this mentee has responded
            const hasResponded = conflict.termsAcceptance?.acceptedBy?.includes(mentee.id) ||
                                conflict.steps?.identifyDefine?.data?.[mentee.id];
            const isCreator = mentee.id === conflict.createdBy;
            const canRemove = canRemoveMentee(mentee);
            
            return (
              <div key={idx} className="flex items-center gap-3 p-4 bg-stone-50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${
                  isCreator ? 'bg-green-100 text-green-700' :
                  hasResponded ? 'bg-emerald-100 text-emerald-700' : 
                  'bg-amber-100 text-amber-700'
                }`}>
                  {(mentee.email || mentee.name || 'M')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 truncate">
                    {mentee.email || mentee.name || 'Mentee'}
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-2">
                    <span className="capitalize">{isCreator ? 'Creator' : 'Mentee'}</span>
                    {!isCreator && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        hasResponded ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {hasResponded ? 'Responded' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
                {canRemove && (
                  <button
                    onClick={() => handleRemoveMentee(mentee)}
                    disabled={removingMentee === mentee.id}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove participant"
                  >
                    {removingMentee === mentee.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
          {conflict.mentor && (
            <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium flex-shrink-0">
                {(conflict.mentor.email || conflict.mentor.name || 'M')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-800 truncate">
                  {conflict.mentor.email || conflict.mentor.name}
                </div>
                <div className="text-xs text-stone-500">Mentor</div>
              </div>
            </div>
          )}
        </div>

        {/* Add Participant Modal */}
        {showAddParticipant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddParticipant(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-medium text-stone-800">Add Participant</h4>
                <button
                  onClick={() => setShowAddParticipant(false)}
                  className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddParticipant();
                    }
                  }}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="participant@example.com"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddParticipant}
                  disabled={addingParticipant || !newParticipantEmail.trim()}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {addingParticipant ? 'Adding...' : 'Add Participant'}
                </button>
                <button
                  onClick={() => setShowAddParticipant(false)}
                  className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div>
        <h3 className="text-xl font-medium text-stone-800 mb-4">Response Settings</h3>
        <div className="grid grid-cols-3 gap-4">
          <InfoCard label="Response Hours" value={conflict.responseHours} />
          <InfoCard label="Wait Time" value={`${conflict.responseWaitTime} minutes`} />
          <InfoCard label="Response Window" value={`${conflict.responseWindow} minutes`} />
        </div>
      </div>
    </div>
  );
}

// Info Card Component
function InfoCard({ label, value, className = '', colSpan = 1 }) {
  return (
    <div className={`p-4 bg-stone-50 rounded-lg overflow-hidden ${colSpan === 2 ? 'col-span-2' : ''}`}>
      <div className="text-sm font-medium text-stone-500 mb-1">{label}</div>
      <div className={`text-stone-800 break-words ${className}`}>{value}</div>
    </div>
  );
}

// Conflict Process Component
function ConflictProcess({ conflict, user, canEdit, onUpdate }) {
  const [activeStep, setActiveStep] = useState(getCurrentStep(conflict));

  function getCurrentStep(c) {
    if (c.status === 'resolved') return 'follow-up';
    if (c.status === 'follow-up') return 'follow-up';
    
    // If status is agree-implement but no ratings exist, should be in evaluate-select
    if (c.status === 'agree-implement') {
      const hasRatings = c.steps?.evaluateSelect?.ratings && 
                        Object.keys(c.steps.evaluateSelect.ratings).length > 0;
      if (!hasRatings) return 'evaluate-select';
      return 'agree-implement';
    }
    
    if (c.status === 'evaluate-select') return 'evaluate-select';
    if (c.status === 'explore-alternatives') return 'explore-alternatives';
    if (c.status === 'communicate') return 'communicate';
    if (c.status === 'identify-define') return 'identify-define';
    // Handle legacy conflicts with 'created' status
    if (c.status === 'created') return 'identify-define';
    // Default to first step
    return 'identify-define';
  }

  // Override canEdit to include creators and email-matched users
  const userCanEdit = conflict.mentees?.some(m => m.id === user.id || m.email.toLowerCase() === user.email.toLowerCase()) ||
                      conflict.mentor?.id === user.id ||
                      conflict.createdBy === user.id ||
                      user.role === 'admin';

  const steps = [
    { id: 'identify-define', label: 'Identify & Define', icon: FileText },
    { id: 'communicate', label: 'Communicate', icon: MessageSquare },
    { id: 'explore-alternatives', label: 'Explore Alternatives', icon: BarChart3 },
    { id: 'evaluate-select', label: 'Evaluate & Select', icon: CheckCircle },
    { id: 'agree-implement', label: 'Agree & Implement', icon: ThumbsUp },
    { id: 'follow-up', label: 'Follow-up', icon: Users }
  ];

  return (
    <div>
      {/* Step Navigator */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            const isCompleted = conflict.steps[step.id.replace('-', '')]?.completed;
            
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-lg'
                      : isCompleted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="whitespace-nowrap">{step.label}</span>
                  {isCompleted && <CheckCircle className="w-4 h-4" />}
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-stone-400 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-stone-50 rounded-xl p-3 sm:p-6">
        {activeStep === 'identify-define' && (
          <IdentifyDefineStep conflict={conflict} user={user} canEdit={userCanEdit} onUpdate={onUpdate} />
        )}
        {activeStep === 'communicate' && (
          <CommunicateStep conflict={conflict} user={user} canEdit={userCanEdit} onUpdate={onUpdate} />
        )}
        {activeStep === 'explore-alternatives' && (
          <ExploreAlternativesStep conflict={conflict} user={user} canEdit={userCanEdit} onUpdate={onUpdate} />
        )}
        {activeStep === 'evaluate-select' && (
          <EvaluateSelectStep conflict={conflict} user={user} canEdit={userCanEdit} onUpdate={onUpdate} />
        )}
        {activeStep === 'agree-implement' && (
          <AgreeImplementStep conflict={conflict} user={user} canEdit={userCanEdit} onUpdate={onUpdate} />
        )}
        {activeStep === 'follow-up' && (
          <FollowUpStep conflict={conflict} user={user} canEdit={userCanEdit} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}

// Mentee Response Card Component
function MenteeResponseCard({ mentee, response, isCurrentUser, userHasAcknowledged, currentUserId, currentUserName, conflict, onUpdate }) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      const updated = {
        ...conflict,
        steps: {
          ...conflict.steps,
          identifyDefine: {
            ...conflict.steps.identifyDefine,
            data: {
              ...conflict.steps.identifyDefine.data,
              [mentee.id]: {
                ...response,
                acknowledgments: [
                  ...(response.acknowledgments || []),
                  {
                    userId: currentUserId,
                    userName: currentUserName,
                    timestamp: new Date().toISOString()
                  }
                ]
              }
            }
          }
        },
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserId
      };

      await storage.set(`conflict:${conflict.id}`, updated);
      onUpdate();
    } catch (error) {
      console.error('Error acknowledging:', error);
      alert('Failed to acknowledge. Please try again.');
    }
    setSubmitting(false);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    setSubmitting(true);
    try {
      const updated = {
        ...conflict,
        steps: {
          ...conflict.steps,
          identifyDefine: {
            ...conflict.steps.identifyDefine,
            data: {
              ...conflict.steps.identifyDefine.data,
              [mentee.id]: {
                ...response,
                comments: [
                  ...(response.comments || []),
                  {
                    userId: currentUserId,
                    userName: currentUserName,
                    text: comment,
                    timestamp: new Date().toISOString()
                  }
                ]
              }
            }
          }
        },
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserId
      };

      await storage.set(`conflict:${conflict.id}`, updated);
      setComment('');
      setShowCommentBox(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${
      isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-white border-stone-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium flex-shrink-0">
            {(mentee.name || mentee.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-stone-800 break-words">
              {mentee.email || mentee.name || 'Unknown user'}
              {isCurrentUser && <span className="text-xs text-blue-600 ml-2">(You)</span>}
            </div>
            <div className="text-xs text-stone-500">
              {new Date(response.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        
        {!isCurrentUser && !userHasAcknowledged && (
          <button
            onClick={handleAcknowledge}
            disabled={submitting}
            className="flex items-center justify-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded-lg transition-colors flex-shrink-0"
          >
            <CheckCircle className="w-4 h-4" />
            Acknowledge
          </button>
        )}
        
        {!isCurrentUser && userHasAcknowledged && (
          <div className="flex items-center gap-1 text-green-600 text-sm flex-shrink-0">
            <CheckCircle className="w-4 h-4" />
            Acknowledged
          </div>
        )}
      </div>

      <p className="text-stone-700 mb-3 break-words">{response.paraphrase}</p>

      {/* Acknowledgments */}
      {response.acknowledgments && response.acknowledgments.length > 0 && (
        <div className="mb-3 pb-3 border-b border-stone-200">
          <div className="text-xs text-stone-500 mb-2">
            Acknowledged by: {response.acknowledgments.map(a => a.userName).join(', ')}
          </div>
        </div>
      )}

      {/* Comments */}
      {response.comments && response.comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {response.comments.map((c, idx) => (
            <div key={idx} className="bg-stone-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-stone-600 mb-1">
                    {c.userName} · {new Date(c.timestamp).toLocaleTimeString()}
                  </div>
                  <p className="text-sm text-stone-700">{c.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment */}
      {!isCurrentUser && (
        <div>
          {!showCommentBox ? (
            <button
              onClick={() => setShowCommentBox(true)}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              + Add clarification or comment
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                placeholder="Ask for clarification or add a comment..."
                rows={2}
                maxLength={500}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddComment}
                  disabled={submitting || !comment.trim()}
                  className="px-4 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white text-sm rounded-lg transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
                <button
                  onClick={() => {
                    setShowCommentBox(false);
                    setComment('');
                  }}
                  className="px-4 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Identify & Define Step
function IdentifyDefineStep({ conflict, user, canEdit, onUpdate }) {
  const [paraphrase, setParaphrase] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [canResolve, setCanResolve] = useState(null);
  const [resolution, setResolution] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const isMentee = conflict.mentees?.some(m => m.id === user.id || m.email.toLowerCase() === user.email.toLowerCase()) ||
                   conflict.createdBy === user.id;
  const userResponse = conflict.steps?.identifyDefine?.data?.[user.id];

  // Profanity check function
  const profanityList = [
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap', 
    'piss', 'dick', 'cock', 'pussy', 'slut', 'whore', 'fag', 'nigger',
    'cunt', 'twat', 'wank', 'bloody', 'bugger', 'arse', 'bollocks', 'prick'
  ];

  const containsProfanity = (text) => {
    const lowerText = text.toLowerCase();
    return profanityList.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerText);
    });
  };

  const handleSubmitParaphrase = async () => {
    setAttemptedSubmit(true);
    
    if (paraphrase.length < 50) {
      alert('Paraphrase must be at least 50 characters');
      return;
    }

    if (paraphrase.length > 250) {
      alert('Paraphrase must be 250 characters or less');
      return;
    }

    if (containsProfanity(paraphrase)) {
      alert('Please remove profanity from your paraphrase');
      return;
    }

    if (!acknowledged) {
      alert('Please acknowledge that you have read the problem statement');
      return;
    }

    const updated = {
      ...conflict,
      steps: {
        ...conflict.steps,
        identifyDefine: {
          ...conflict.steps.identifyDefine,
          data: {
            ...conflict.steps.identifyDefine.data,
            [user.id]: {
              paraphrase,
              acknowledged,
              timestamp: new Date().toISOString()
            }
          }
        }
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };

    await storage.set(`conflict:${conflict.id}`, updated);
    onUpdate();
  };

  const handleResolutionProposal = async (canResolveNow) => {
    console.log('handleResolutionProposal called', { canResolveNow, resolution });
    
    if (canResolveNow && !resolution.trim()) {
      alert('Please provide a resolution proposal');
      return;
    }

    try {
      const updated = {
        ...conflict,
        steps: {
          ...conflict.steps,
          identifyDefine: {
            ...conflict.steps.identifyDefine,
            resolutionCheck: {
              proposedBy: user.id,
              proposedByName: user.name,
              proposedByEmail: user.email,
              canResolve: canResolveNow,
              resolution: canResolveNow ? resolution : null,
              timestamp: new Date().toISOString()
            }
          }
        },
        status: canResolveNow ? 'agree-implement' : 'communicate',
        statusHistory: [
          ...conflict.statusHistory,
          { 
            status: canResolveNow ? 'agree-implement' : 'communicate', 
            timestamp: new Date().toISOString() 
          }
        ],
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      console.log('Saving updated conflict:', updated);
      const saved = await storage.set(`conflict:${conflict.id}`, updated);
      console.log('Save result:', saved);
      
      if (saved) {
        console.log('Calling onUpdate');
        await onUpdate();
        
        // Show success message
        if (canResolveNow) {
          alert('Resolution proposal submitted! The conflict status has been updated to "Agree & Implement".');
        } else {
          alert('Moving to Communication step where you can discuss perspectives in detail.');
        }
      } else {
        alert('Failed to save resolution. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleResolutionProposal:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Problem Statement Summary */}
      <div className="bg-white rounded-lg p-6 border-2 border-amber-200">
        <h4 className="font-medium text-amber-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Problem Statement to Paraphrase
        </h4>
        <div className="space-y-3 text-stone-700">
          <div>
            <span className="font-medium text-stone-800">Who:</span> {conflict.problemStatement.who}
          </div>
          <div>
            <span className="font-medium text-stone-800">What:</span> {conflict.problemStatement?.what || 'Not specified'}
          </div>
          <div>
            <span className="font-medium text-stone-800">Where:</span> {conflict.problemStatement.where}
          </div>
          <div>
            <span className="font-medium text-stone-800">When:</span> {conflict.problemStatement.when}
          </div>
          <div>
            <span className="font-medium text-stone-800">How:</span> {conflict.problemStatement.how}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-stone-800 mb-3">Step 1: Restate the Problem</h4>
        <p className="text-sm text-stone-600 mb-4">
          In 250 characters or less, paraphrase your understanding of the conflict.
        </p>

        {userResponse ? (
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-green-700 mb-1">Your response submitted</div>
                <p className="text-stone-700">{userResponse.paraphrase}</p>
                <p className="text-xs text-stone-500 mt-2">
                  Submitted {new Date(userResponse.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : isMentee && canEdit ? (
          <div>
            <div className="relative">
              <textarea
                value={paraphrase}
                onChange={(e) => setParaphrase(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
                placeholder="Paraphrase the problem statement..."
                rows={4}
                maxLength={250}
              />
              <VoiceInputButton 
                onResult={(text) => setParaphrase(prev => prev + (prev ? ' ' : '') + text)}
                className="absolute right-2 top-2"
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${
                paraphrase.length > 250 
                  ? 'text-red-500 font-medium' 
                  : paraphrase.length >= 50 
                  ? 'text-green-600 font-medium' 
                  : 'text-stone-500'
              }`}>
                {paraphrase.length}/250 characters {paraphrase.length < 50 ? `(need ${50 - paraphrase.length} more)` : ''}
              </span>
            </div>

            {/* Validation Checklist */}
            {paraphrase.length > 0 && (
              <div className="mb-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="text-xs font-medium text-stone-700 mb-2">Requirements:</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    {paraphrase.length >= 50 && paraphrase.length <= 250 ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-stone-400" />
                    )}
                    <span className={paraphrase.length >= 50 && paraphrase.length <= 250 ? 'text-green-700' : 'text-stone-600'}>
                      50-250 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {containsProfanity(paraphrase) ? (
                      <X className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <span className={containsProfanity(paraphrase) ? 'text-red-700' : 'text-green-700'}>
                      No profanity
                    </span>
                  </div>
                </div>
              </div>
            )}

            <label className={`flex items-center gap-2 text-sm transition-colors mb-4 ${
                attemptedSubmit && !acknowledged 
                  ? 'text-red-600 font-medium' 
                  : acknowledged 
                  ? 'text-green-600' 
                  : 'text-stone-600'
              }`}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => {
                    setAcknowledged(e.target.checked);
                    if (e.target.checked) setAttemptedSubmit(false);
                  }}
                  className={`rounded ${
                    attemptedSubmit && !acknowledged 
                      ? 'border-2 border-red-500 ring-2 ring-red-200' 
                      : ''
                  }`}
                />
                <span className={attemptedSubmit && !acknowledged ? 'animate-pulse' : ''}>
                  I acknowledge receipt and have read the problem statement
                  {attemptedSubmit && !acknowledged && <span className="text-red-600 ml-1">*</span>}
                </span>
              </label>
            {attemptedSubmit && !acknowledged && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Please check the acknowledgment box to confirm you have read the problem statement
                </p>
              </div>
            )}
            <button
              onClick={handleSubmitParaphrase}
              disabled={paraphrase.length < 50 || paraphrase.length > 250 || containsProfanity(paraphrase)}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Submit Response
            </button>
          </div>
        ) : (
          <p className="text-stone-500 italic">Waiting for mentees to respond...</p>
        )}
      </div>

      {/* All Mentee Responses */}
      {Object.keys(conflict.steps?.identifyDefine?.data || {}).length > 0 && (
        <div>
          <h4 className="font-medium text-stone-800 mb-3">All Paraphrases</h4>
          <p className="text-sm text-stone-600 mb-4">
            Review how each participant understands the conflict. Acknowledge and comment if clarification is needed.
          </p>
          
          <div className="space-y-4">
            {Object.entries(conflict.steps?.identifyDefine?.data || {}).map(([userId, response]) => {
              // Try to find the mentee by ID
              let mentee = conflict.mentees?.find(m => m.id === userId);
              
              // If not found by ID, try to find by checking if userId matches any user in the conflict
              if (!mentee && userId === conflict.createdBy) {
                // This is the creator - try to find them in mentees or use creator info
                const creatorAsMentee = conflict.mentees?.find(m => m.id === conflict.createdBy);
                mentee = creatorAsMentee || { 
                  id: userId, 
                  email: user.id === userId ? user.email : null,
                  name: user.id === userId ? user.name : null
                };
              }
              
              // If still not found, use current user info if it's them
              if (!mentee && userId === user.id) {
                mentee = { id: userId, email: user.email, name: user.name };
              }
              
              // Last resort - try to get any info we can
              if (!mentee) {
                mentee = { id: userId, email: 'Unknown user', name: 'Unknown user' };
              }
              
              const isCurrentUser = userId === user.id;
              const acknowledgments = response.acknowledgments || [];
              const userHasAcknowledged = acknowledgments.some(a => a.userId === user.id);
              
              return (
                <MenteeResponseCard
                  key={userId}
                  mentee={mentee}
                  response={response}
                  isCurrentUser={isCurrentUser}
                  userHasAcknowledged={userHasAcknowledged}
                  currentUserId={user.id}
                  currentUserName={user.name}
                  conflict={conflict}
                  onUpdate={onUpdate}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Resolution Check */}
      {Object.keys(conflict.steps?.identifyDefine?.data || {}).length >= (conflict.mentees?.length || 2) && (
        <div className="border-t border-stone-200 pt-6">
          {/* CTA Box */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-medium text-green-800 mb-2">Can the conflict be resolved?</h4>
                <p className="text-green-700 text-sm mb-3">
                  If reviewing each other's understanding clarified the conflict and you now agree on what happened, 
                  you can propose a resolution right now and skip the detailed communication steps.
                </p>
                <p className="text-green-600 text-xs">
                  💡 Tip: Choose "Yes, propose resolution" if the paraphrasing cleared up the confusion. 
                  Choose "No, continue process" if you need to discuss perspectives further.
                </p>
              </div>
            </div>
          </div>

          <h4 className="font-medium text-stone-800 mb-3">Resolution Check</h4>
          <p className="text-sm text-stone-600 mb-4">
            Can this conflict be resolved at this stage?
          </p>

          {conflict.steps?.identifyDefine?.resolutionCheck ? (
            <div className="p-6 bg-white rounded-lg border-2 border-stone-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-medium text-lg text-stone-800 mb-1">
                    {conflict.steps.identifyDefine.resolutionCheck.canResolve ? '✓ Resolution Proposed' : '→ Continuing to Communication Step'}
                  </p>
                  <div className="text-sm text-stone-500">
                    By {conflict.steps.identifyDefine.resolutionCheck.proposedByEmail || 
                        conflict.steps.identifyDefine.resolutionCheck.proposedByName || 
                        (() => {
                          const proposerId = conflict.steps.identifyDefine.resolutionCheck.proposedBy;
                          const proposer = conflict.mentees?.find(m => m.id === proposerId);
                          if (proposer) return proposer.email || proposer.name;
                          if (proposerId === user.id) return user.email || user.name;
                          return 'Participant';
                        })()} · {new Date(conflict.steps.identifyDefine.resolutionCheck.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              {conflict.steps.identifyDefine.resolutionCheck.resolution && (
                <div>
                  <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">Proposed Resolution:</div>
                    <p className="text-stone-700">{conflict.steps.identifyDefine.resolutionCheck.resolution}</p>
                  </div>

                  {/* Accept/Reject Buttons for Other Mentees */}
                  {conflict.steps.identifyDefine.resolutionCheck.proposedBy !== user.id && 
                   !conflict.steps.identifyDefine.resolutionCheck.responses?.[user.id] && (
                    <div className="mt-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-amber-800 font-medium mb-1">Your Response Required</p>
                        <p className="text-xs text-amber-700">
                          Please review the proposed resolution and decide whether to accept or reject it.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={async () => {
                            const updated = {
                              ...conflict,
                              steps: {
                                ...conflict.steps,
                                identifyDefine: {
                                  ...conflict.steps.identifyDefine,
                                  resolutionCheck: {
                                    ...conflict.steps.identifyDefine.resolutionCheck,
                                    responses: {
                                      ...(conflict.steps.identifyDefine.resolutionCheck.responses || {}),
                                      [user.id]: {
                                        accepted: true,
                                        userId: user.id,
                                        userEmail: user.email,
                                        userName: user.name,
                                        timestamp: new Date().toISOString()
                                      }
                                    }
                                  }
                                }
                              },
                              updatedAt: new Date().toISOString(),
                              updatedBy: user.id
                            };

                            // Check if all mentees have accepted
                            const allResponses = Object.values(updated.steps.identifyDefine.resolutionCheck.responses || {});
                            const allAccepted = allResponses.every(r => r.accepted);
                            const allMenteesResponded = allResponses.length >= (conflict.mentees?.length || 1);

                            if (allAccepted && allMenteesResponded) {
                              updated.status = 'evaluate-select';
                              updated.statusHistory.push({
                                status: 'evaluate-select',
                                timestamp: new Date().toISOString()
                              });
                            }

                            await storage.set(`conflict:${conflict.id}`, updated);
                            await onUpdate();
                            alert('You have accepted the proposed resolution!');
                          }}
                          className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Accept Resolution
                        </button>
                        <button
                          onClick={async () => {
                            const updated = {
                              ...conflict,
                              steps: {
                                ...conflict.steps,
                                identifyDefine: {
                                  ...conflict.steps.identifyDefine,
                                  resolutionCheck: {
                                    ...conflict.steps.identifyDefine.resolutionCheck,
                                    responses: {
                                      ...(conflict.steps.identifyDefine.resolutionCheck.responses || {}),
                                      [user.id]: {
                                        accepted: false,
                                        userId: user.id,
                                        userEmail: user.email,
                                        userName: user.name,
                                        timestamp: new Date().toISOString()
                                      }
                                    }
                                  }
                                }
                              },
                              status: 'communicate',
                              statusHistory: [
                                ...conflict.statusHistory,
                                {
                                  status: 'communicate',
                                  timestamp: new Date().toISOString()
                                }
                              ],
                              updatedAt: new Date().toISOString(),
                              updatedBy: user.id
                            };

                            await storage.set(`conflict:${conflict.id}`, updated);
                            await onUpdate();
                            alert('Resolution rejected. Moving to Communication step.');
                          }}
                          className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-5 h-5" />
                          Reject Resolution
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show Responses Status */}
                  {conflict.steps.identifyDefine.resolutionCheck.responses && 
                   Object.keys(conflict.steps.identifyDefine.resolutionCheck.responses).length > 0 && (
                    <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="text-sm font-medium text-stone-700 mb-2">Responses:</div>
                      <div className="space-y-2">
                        {Object.values(conflict.steps.identifyDefine.resolutionCheck.responses).map((response, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {response.accepted ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={response.accepted ? 'text-green-700' : 'text-red-700'}>
                              {response.userEmail || response.userName} {response.accepted ? 'accepted' : 'rejected'}
                            </span>
                            <span className="text-stone-400 text-xs">
                              · {new Date(response.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCanResolve(true)}
                  className={`py-6 rounded-xl font-medium transition-all transform hover:scale-[1.02] flex flex-col items-center gap-2 ${
                    canResolve === true
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white border-2 border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  <CheckCircle className="w-8 h-8" />
                  <div className="text-lg">Yes, Propose Resolution</div>
                  <div className="text-xs opacity-80">The rephrasing cleared it up</div>
                </button>
                <button
                  onClick={() => handleResolutionProposal(false)}
                  className={`py-6 rounded-xl font-medium transition-all transform hover:scale-[1.02] flex flex-col items-center gap-2 ${
                    canResolve === false
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-white border-2 border-orange-300 text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <MessageSquare className="w-8 h-8" />
                  <div className="text-lg">No, Continue Process</div>
                  <div className="text-xs opacity-80">We need to discuss further</div>
                </button>
              </div>

              {canResolve === true && (
                <div className="bg-white rounded-xl p-6 border-2 border-green-200">
                  <h5 className="font-medium text-green-800 mb-3">Propose Your Resolution</h5>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
                    placeholder="Describe how you propose to resolve this conflict..."
                    rows={4}
                  />
                  <button
                    onClick={() => handleResolutionProposal(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Submit Resolution Proposal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Communicate Step
function CommunicateStep({ conflict, user, canEdit, onUpdate }) {
  const [becauseStatement, setBecauseStatement] = useState('');
  const [paraphrase, setParaphrase] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lateResponseReason, setLateResponseReason] = useState('');
  const [becauseStatementTimeRemaining, setBecauseStatementTimeRemaining] = useState(0);

  const isMentee = conflict.mentees?.some(m => m.id === user.id || m.email?.toLowerCase() === user.email?.toLowerCase()) ||
                   conflict.createdBy === user.id;
  const cycles = conflict.steps.communicate?.cycles || [];
  const maxCycles = 5;

  const validateBecauseStatement = (statement) => {
    if (statement.length < 50 || statement.length > 250) return false;
    if (!statement.toLowerCase().startsWith('because')) return false;
    if (!statement.toLowerCase().includes('i feel')) return false;
    
    // Check for profanity
    const profanityList = [
      'damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'ass', 'bastard',
      'piss', 'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigger',
      'nigga', 'retard', 'retarded', 'cunt', 'asshole', 'motherfucker'
    ];
    
    const lowerStatement = statement.toLowerCase();
    const containsProfanity = profanityList.some(word => {
      // Check for whole word matches (with word boundaries)
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerStatement);
    });
    
    if (containsProfanity) return false;
    
    return true;
  };

  const containsProfanity = (statement) => {
    const profanityList = [
      'damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'ass', 'bastard',
      'piss', 'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigger',
      'nigga', 'retard', 'retarded', 'cunt', 'asshole', 'motherfucker'
    ];
    
    const lowerStatement = statement.toLowerCase();
    return profanityList.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerStatement);
    });
  };

  const validateParaphrase = (text) => {
    if (text.length < 50 || text.length > 250) return false;
    if (containsProfanity(text)) return false;
    return true;
  };

  const handleSubmitBecause = async () => {
    if (!validateBecauseStatement(becauseStatement)) {
      alert('Because statement must start with "Because", include "I feel", be 50-250 characters, and contain no profanity');
      return;
    }

    // Check if this is a late submission (only after first cycle)
    const isLate = cycles.length > 0 && isBecauseStatementLate();
    
    if (isLate && lateResponseReason.trim().length < 10) {
      alert('Please provide a reason for submitting late (minimum 10 characters)');
      return;
    }

    const newCycle = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      statement: becauseStatement,
      paraphrase: null,
      timestamp: new Date().toISOString(),
      ...(isLate && {
        lateSubmission: true,
        lateReason: lateResponseReason.trim(),
        minutesLate: Math.ceil(Math.abs(becauseStatementTimeRemaining))
      })
    };

    const updated = {
      ...conflict,
      steps: {
        ...conflict.steps,
        communicate: {
          ...conflict.steps.communicate,
          cycles: [...cycles, newCycle]
        }
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };

    await storage.set(`conflict:${conflict.id}`, updated);
    setBecauseStatement('');
    setLateResponseReason('');
    onUpdate();
  };

  const handleSubmitParaphrase = async (cycleIdx) => {
    // Check if response is late
    const cycle = cycles[cycleIdx];
    const statementTime = new Date(cycle.timestamp);
    const now = new Date();
    const minutesPassed = (now - statementTime) / (1000 * 60);
    const totalResponseWindow = conflict.responseWaitTime + conflict.responseWindow;
    const isLate = minutesPassed > totalResponseWindow;

    if (isLate && !lateResponseReason.trim()) {
      alert('Please provide a reason for the late response before submitting.');
      return;
    }

    const updatedCycles = [...cycles];
    updatedCycles[cycleIdx] = {
      ...updatedCycles[cycleIdx],
      paraphrase,
      paraphrasedBy: user.id,
      paraphrasedAt: new Date().toISOString(),
      ...(isLate && {
        lateResponse: true,
        lateResponseReason: lateResponseReason.trim(),
        minutesLate: Math.ceil(minutesPassed - totalResponseWindow)
      })
    };

    const updated = {
      ...conflict,
      steps: {
        ...conflict.steps,
        communicate: {
          ...conflict.steps.communicate,
          cycles: updatedCycles
        }
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };

    await storage.set(`conflict:${conflict.id}`, updated);
    setParaphrase('');
    setLateResponseReason('');
    onUpdate();
  };

  const canAddStatement = isMentee && canEdit && cycles.length < maxCycles;
  const needsParaphrase = cycles.length > 0 && !cycles[cycles.length - 1].paraphrase && 
                          cycles[cycles.length - 1].userId !== user.id;

  // Calculate if wait time has passed for paraphrasing
  const canParaphraseNow = () => {
    if (!needsParaphrase) return false;
    const lastCycle = cycles[cycles.length - 1];
    const statementTime = new Date(lastCycle.timestamp);
    const now = new Date();
    const minutesPassed = (now - statementTime) / (1000 * 60);
    return minutesPassed >= conflict.responseWaitTime;
  };

  const getTimeUntilCanParaphrase = () => {
    if (!needsParaphrase) return 0;
    const lastCycle = cycles[cycles.length - 1];
    const statementTime = new Date(lastCycle.timestamp);
    const now = new Date();
    const minutesPassed = (now - statementTime) / (1000 * 60);
    const minutesRemaining = Math.max(0, conflict.responseWaitTime - minutesPassed);
    return minutesRemaining;
  };

  const formatTimeRemaining = (minutes) => {
    const totalSeconds = Math.ceil(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate time remaining for Because statement submission
  const getBecauseStatementTimeRemaining = () => {
    const lastCycle = cycles[cycles.length - 1];
    if (!lastCycle || !lastCycle.paraphrase) return 0;
    
    const paraphraseTime = new Date(lastCycle.paraphrasedAt);
    const now = new Date();
    const minutesPassed = (now - paraphraseTime) / (1000 * 60);
    const minutesRemaining = Math.max(0, conflict.responseWindow - minutesPassed);
    return minutesRemaining;
  };

  const isBecauseStatementLate = () => {
    if (cycles.length === 0) return false; // First statement, no time limit
    const lastCycle = cycles[cycles.length - 1];
    if (!lastCycle || !lastCycle.paraphrase) return false;
    return getBecauseStatementTimeRemaining() <= 0;
  };

  // Update timer every second
  React.useEffect(() => {
    if (needsParaphrase && !canParaphraseNow()) {
      setTimeRemaining(getTimeUntilCanParaphrase());
      
      const interval = setInterval(() => {
        const remaining = getTimeUntilCanParaphrase();
        setTimeRemaining(remaining);
        
        // Stop timer when time is up
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [needsParaphrase, cycles]);

  // Update Because statement timer every second
  React.useEffect(() => {
    if (canAddStatement && !needsParaphrase && cycles.length > 0) {
      setBecauseStatementTimeRemaining(getBecauseStatementTimeRemaining());
      
      const interval = setInterval(() => {
        const remaining = getBecauseStatementTimeRemaining();
        setBecauseStatementTimeRemaining(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [canAddStatement, needsParaphrase, cycles]);

  // Update status messages every minute for response window tracking
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update response window messages
      setTimeRemaining(getTimeUntilCanParaphrase());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [cycles]);

  console.log('CommunicateStep debug:', { 
    isMentee, 
    canEdit, 
    cyclesLength: cycles.length, 
    maxCycles,
    canAddStatement,
    needsParaphrase,
    canParaphrase: canParaphraseNow(),
    minutesUntilCanParaphrase: getTimeUntilCanParaphrase()
  });

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-stone-800 mb-3">Communication Phase</h4>
        <p className="text-sm text-stone-600 mb-4">
          Share your perspective using "Because" statements. Each statement must start with "Because", 
          include "I feel", and be 50-250 characters. Maximum 5 cycles.
        </p>
      </div>

      {/* Existing Cycles */}
      <div className="space-y-4">
        {cycles.map((cycle, idx) => (
          <div key={idx} className="bg-white rounded-lg p-4 border border-stone-200 overflow-hidden">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium flex-shrink-0">
                {cycle.userName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-800 mb-1 break-words">{cycle.userName}</div>
                <p className="text-stone-700 break-words">{cycle.statement}</p>
                <p className="text-xs text-stone-500 mt-2">
                  {new Date(cycle.timestamp).toLocaleString()}
                </p>
                {cycle.lateSubmission && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1 text-xs text-red-700 font-medium mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Late Submission ({cycle.minutesLate} min late)
                    </div>
                    <p className="text-xs text-red-600 italic break-words">"{cycle.lateReason}"</p>
                  </div>
                )}
              </div>
            </div>

            {cycle.paraphrase && (
              <div className="ml-11 pl-4 border-l-2 border-green-200 mt-3">
                <p className="text-sm text-stone-600 mb-1">Paraphrased:</p>
                <p className="text-stone-700 break-words">{cycle.paraphrase}</p>
                {cycle.lateResponse && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1 text-xs text-red-700 font-medium mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Late Response ({cycle.minutesLate} min late)
                    </div>
                    <p className="text-xs text-red-600 italic break-words">"{cycle.lateResponseReason}"</p>
                  </div>
                )}
              </div>
            )}

            {!cycle.paraphrase && idx === cycles.length - 1 && needsParaphrase && (
              <div className="ml-11 mt-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h6 className="text-sm font-medium text-blue-800 mb-2">Paraphrase to Show Understanding</h6>
                <p className="text-xs text-blue-700 mb-3">Restate their perspective in your own words (50-250 characters, no profanity)</p>
                
                {/* Wait Time Notice */}
                {!canParaphraseNow() && (
                  <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-300">
                    <div className="flex items-center gap-2 text-amber-800 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Cooling Period Active</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl font-mono font-bold text-amber-900">
                        {formatTimeRemaining(timeRemaining)}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-600 transition-all duration-1000 ease-linear"
                            style={{ 
                              width: `${Math.max(0, 100 - (timeRemaining / conflict.responseWaitTime * 100))}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-700">
                      This cooling period helps ensure thoughtful, calm responses. 
                      You'll be able to paraphrase when the timer reaches 0:00.
                    </p>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={paraphrase}
                    onChange={(e) => setParaphrase(e.target.value)}
                    disabled={!canParaphraseNow()}
                    className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2 disabled:bg-stone-100 disabled:cursor-not-allowed"
                    placeholder={canParaphraseNow() ? "Paraphrase their statement to show understanding..." : "Wait for cooling period to end..."}
                    rows={3}
                    maxLength={250}
                  />
                  {canParaphraseNow() && (
                    <VoiceInputButton 
                      onResult={(text) => setParaphrase(prev => prev + (prev ? ' ' : '') + text)}
                      className="absolute right-2 top-2"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${
                    paraphrase.length > 250 
                      ? 'text-red-500 font-medium' 
                      : paraphrase.length >= 50 
                      ? 'text-green-600 font-medium' 
                      : 'text-stone-500'
                  }`}>
                    {paraphrase.length}/250 characters {paraphrase.length < 50 ? `(need ${50 - paraphrase.length} more)` : ''}
                  </span>
                </div>

                {/* Late Response Reason - Only show if response window expired */}
                {(() => {
                  const statementTime = new Date(cycles[cycles.length - 1].timestamp);
                  const now = new Date();
                  const minutesPassed = (now - statementTime) / (1000 * 60);
                  const totalResponseWindow = conflict.responseWaitTime + conflict.responseWindow;
                  const isLate = minutesPassed > totalResponseWindow;

                  if (isLate) {
                    return (
                      <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <label className="block text-sm font-medium text-red-800 mb-2">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          Required: Explain why you missed the response window
                        </label>
                        <textarea
                          value={lateResponseReason}
                          onChange={(e) => setLateResponseReason(e.target.value)}
                          className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          placeholder="Example: I was in a meeting and couldn't respond in time..."
                          rows={2}
                          maxLength={200}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs ${
                            lateResponseReason.trim().length < 10 
                              ? 'text-red-500' 
                              : 'text-green-600'
                          }`}>
                            {lateResponseReason.length}/200 characters {lateResponseReason.trim().length < 10 ? '(min 10)' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Validation Checklist for Paraphrase */}
                {paraphrase.length > 0 && canParaphraseNow() && (
                  <div className="mb-3 p-2 bg-white rounded border border-stone-200">
                    <div className="text-xs font-medium text-stone-700 mb-1">Requirements:</div>
                    <div className="space-y-1">
                      <div className={`text-xs flex items-center gap-2 ${
                        paraphrase.length >= 50 && paraphrase.length <= 250 
                          ? 'text-green-600' 
                          : 'text-stone-500'
                      }`}>
                        {paraphrase.length >= 50 && paraphrase.length <= 250 ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        50-250 characters
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${
                        !containsProfanity(paraphrase) 
                          ? 'text-green-600' 
                          : 'text-red-500'
                      }`}>
                        {!containsProfanity(paraphrase) ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        No profanity or offensive language
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleSubmitParaphrase(idx)}
                  disabled={(() => {
                    const statementTime = new Date(cycles[cycles.length - 1].timestamp);
                    const now = new Date();
                    const minutesPassed = (now - statementTime) / (1000 * 60);
                    const totalResponseWindow = conflict.responseWaitTime + conflict.responseWindow;
                    const isLate = minutesPassed > totalResponseWindow;
                    
                    if (!canParaphraseNow()) return true;
                    if (!validateParaphrase(paraphrase)) return true;
                    if (isLate && lateResponseReason.trim().length < 10) return true;
                    return false;
                  })()}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {!canParaphraseNow() ? `Wait ${formatTimeRemaining(timeRemaining)}` : 'Submit Paraphrase'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Statement */}
      {canAddStatement && !needsParaphrase && (
        <div className="bg-white rounded-lg p-4 border-2 border-dashed border-amber-300">
          <h5 className="font-medium text-stone-800 mb-2">Share Your Perspective</h5>
          <p className="text-sm text-stone-600 mb-3">
            Write a "Because" statement that starts with "Because", includes "I feel", and is 50-250 characters.
          </p>

          {/* Timer Display (only show after first cycle) */}
          {cycles.length > 0 && cycles[cycles.length - 1]?.paraphrase && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Response Window</span>
                </div>
                <div className="text-lg font-mono font-bold text-amber-900">
                  {formatTimeRemaining(becauseStatementTimeRemaining)}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1">
                  <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-600 transition-all duration-1000 ease-linear"
                      style={{ 
                        width: `${Math.max(0, (becauseStatementTimeRemaining / conflict.responseWindow) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-700">
                {isBecauseStatementLate() ? (
                  <span className="text-red-700 font-medium">⚠️ Response window expired. You must provide a reason for late submission.</span>
                ) : (
                  <>You have {conflict.responseWindow} minutes to submit your "Because" statement after the last paraphrase.</>
                )}
              </p>
            </div>
          )}

          <div className="relative">
            <textarea
              value={becauseStatement}
              onChange={(e) => setBecauseStatement(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
              placeholder='Example: Because I feel frustrated when plans change without notice, I need more communication about schedule updates.'
              rows={3}
              maxLength={250}
            />
            <VoiceInputButton 
              onResult={(text) => setBecauseStatement(prev => prev + (prev ? ' ' : '') + text)}
              className="absolute right-2 top-2"
            />
          </div>

          {/* Late Reason Field - Only show if response window expired */}
          {cycles.length > 0 && isBecauseStatementLate() && (
            <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <label className="block text-sm font-medium text-red-800 mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Required: Explain why you're submitting late
              </label>
              <textarea
                value={lateResponseReason}
                onChange={(e) => setLateResponseReason(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="Example: I needed more time to process my feelings..."
                rows={2}
                maxLength={200}
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${
                  lateResponseReason.trim().length < 10 
                    ? 'text-red-500' 
                    : 'text-green-600'
                }`}>
                  {lateResponseReason.length}/200 characters {lateResponseReason.trim().length < 10 ? '(min 10)' : ''}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${
              becauseStatement.length > 250 
                ? 'text-red-500 font-medium' 
                : becauseStatement.length >= 50 
                ? 'text-green-600 font-medium' 
                : 'text-stone-500'
            }`}>
              {becauseStatement.length}/250 characters {becauseStatement.length < 50 ? `(need ${50 - becauseStatement.length} more)` : ''}
            </span>
          </div>

          {/* Validation Checklist */}
          {becauseStatement.length > 0 && (
            <div className="mb-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="text-xs font-medium text-stone-700 mb-2">Requirements:</div>
              <div className="space-y-1">
                <div className={`text-xs flex items-center gap-2 ${
                  becauseStatement.length >= 50 && becauseStatement.length <= 250 
                    ? 'text-green-600' 
                    : 'text-stone-500'
                }`}>
                  {becauseStatement.length >= 50 && becauseStatement.length <= 250 ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  50-250 characters
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  becauseStatement.toLowerCase().startsWith('because') 
                    ? 'text-green-600' 
                    : 'text-stone-500'
                }`}>
                  {becauseStatement.toLowerCase().startsWith('because') ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  Starts with "Because"
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  becauseStatement.toLowerCase().includes('i feel') 
                    ? 'text-green-600' 
                    : 'text-stone-500'
                }`}>
                  {becauseStatement.toLowerCase().includes('i feel') ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  Includes "I feel"
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  !containsProfanity(becauseStatement) 
                    ? 'text-green-600' 
                    : 'text-red-500'
                }`}>
                  {!containsProfanity(becauseStatement) ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  No profanity or offensive language
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmitBecause}
            disabled={!validateBecauseStatement(becauseStatement) || (cycles.length > 0 && isBecauseStatementLate() && lateResponseReason.trim().length < 10)}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Submit Statement
          </button>
        </div>
      )}

      {/* Waiting for Other Person to Paraphrase */}
      {canAddStatement && needsParaphrase && cycles[cycles.length - 1].userId === user.id && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-purple-800 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Waiting for Response</span>
          </div>
          <p className="text-sm text-purple-700">
            Your "Because" statement has been shared. The other participant needs to paraphrase your statement 
            before you can continue the conversation. They must wait {conflict.responseWaitTime} minutes (cooling period) before responding.
          </p>
        </div>
      )}

      {/* Status Message at Bottom */}
      {cycles.length >= maxCycles && cycles[cycles.length - 1]?.paraphrase && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-1">
            <p className="text-green-800 font-medium">Communication Complete</p>
            <p className="text-xs text-green-600">
              {new Date(cycles[cycles.length - 1].paraphrasedAt).toLocaleString()}
            </p>
          </div>
          <p className="text-green-600 text-sm mb-3">Maximum cycles reached. Ready to move to exploring alternatives.</p>
          <button
            onClick={async () => {
              console.log('Continue button clicked');
              try {
                const updated = {
                  ...conflict,
                  status: 'explore-alternatives',
                  steps: {
                    ...conflict.steps,
                    exploreAlternatives: {
                      ...(conflict.steps.exploreAlternatives || {}),
                      alternatives: conflict.steps.exploreAlternatives?.alternatives || []
                    }
                  },
                  statusHistory: [
                    ...conflict.statusHistory,
                    { status: 'explore-alternatives', timestamp: new Date().toISOString() }
                  ],
                  updatedAt: new Date().toISOString(),
                  updatedBy: user.id
                };
                console.log('Updating conflict:', updated);
                await storage.set(`conflict:${conflict.id}`, updated);
                console.log('Storage updated, calling onUpdate');
                await onUpdate();
                console.log('onUpdate complete');
              } catch (error) {
                console.error('Error moving to next step:', error);
                alert('Failed to move to next step. Please try again.');
              }
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Continue to Explore Alternatives
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {cycles.length > 0 && (cycles.length < maxCycles || !cycles[cycles.length - 1]?.paraphrase) && (
        <div>
          {/* User is waiting for other person to paraphrase their statement */}
          {cycles[cycles.length - 1] && !cycles[cycles.length - 1].paraphrase && cycles[cycles.length - 1].userId === user.id && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Awaiting Paraphrase</span>
                </div>
                <span className="text-xs text-blue-600">
                  Submitted: {new Date(cycles[cycles.length - 1].timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-blue-700 mb-2">
                Your "Because" statement has been shared. The other participant needs to paraphrase your statement 
                before the conversation can continue.
              </p>
              {(() => {
                const statementTime = new Date(cycles[cycles.length - 1].timestamp);
                const now = new Date();
                const minutesPassed = (now - statementTime) / (1000 * 60);
                const coolingPeriodRemaining = Math.max(0, conflict.responseWaitTime - minutesPassed);
                const totalResponseWindow = conflict.responseWaitTime + conflict.responseWindow;
                const responseWindowRemaining = Math.max(0, totalResponseWindow - minutesPassed);
                
                if (coolingPeriodRemaining > 0) {
                  // Still in cooling period
                  return (
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      ⏱️ Cooling period: {Math.ceil(coolingPeriodRemaining)} minute{Math.ceil(coolingPeriodRemaining) !== 1 ? 's' : ''} remaining before they can respond
                    </div>
                  );
                } else if (responseWindowRemaining > 0) {
                  // Cooling period over, in response window
                  return (
                    <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      ⏰ Response window: {Math.ceil(responseWindowRemaining)} minute{Math.ceil(responseWindowRemaining) !== 1 ? 's' : ''} remaining for them to respond
                    </div>
                  );
                } else {
                  // Response window expired
                  return (
                    <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                      ⚠️ Response window has expired
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* User needs to paraphrase the other person's statement */}
          {cycles[cycles.length - 1] && !cycles[cycles.length - 1].paraphrase && cycles[cycles.length - 1].userId !== user.id && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Action Required: Paraphrase Response</span>
                </div>
                <span className="text-xs text-orange-600">
                  Received: {new Date(cycles[cycles.length - 1].timestamp).toLocaleString()}
                </span>
              </div>
              {(() => {
                const statementTime = new Date(cycles[cycles.length - 1].timestamp);
                const now = new Date();
                const minutesPassed = (now - statementTime) / (1000 * 60);
                const coolingPeriodRemaining = Math.max(0, conflict.responseWaitTime - minutesPassed);
                const totalResponseWindow = conflict.responseWaitTime + conflict.responseWindow;
                const responseWindowRemaining = Math.max(0, totalResponseWindow - minutesPassed);
                
                if (coolingPeriodRemaining > 0) {
                  // Still in cooling period - cannot respond yet
                  return (
                    <>
                      <p className="text-sm text-orange-700 mb-2">
                        A cooling period is in effect to allow for thoughtful responses. 
                        You'll be able to paraphrase the statement above once the timer expires.
                      </p>
                      <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                        ⏱️ Cooling period: {Math.ceil(coolingPeriodRemaining)} minute{Math.ceil(coolingPeriodRemaining) !== 1 ? 's' : ''} remaining before you can respond
                      </div>
                    </>
                  );
                } else if (responseWindowRemaining > 0) {
                  // Cooling period over, can respond now
                  return (
                    <>
                      <p className="text-sm text-orange-700 mb-2">
                        Please paraphrase the statement above to show your understanding. 
                        After submitting your paraphrase, you'll be able to share your own perspective.
                      </p>
                      <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        ✓ You can now respond • {Math.ceil(responseWindowRemaining)} minute{Math.ceil(responseWindowRemaining) !== 1 ? 's' : ''} remaining in response window
                      </div>
                    </>
                  );
                } else {
                  // Response window expired
                  return (
                    <>
                      <p className="text-sm text-orange-700 mb-2">
                        The response window has expired, but you can still paraphrase the statement above.
                      </p>
                      <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                        ⚠️ Response window has expired
                      </div>
                    </>
                  );
                }
              })()}
            </div>
          )}

          {/* Both can continue - last statement was paraphrased (but not at max cycles yet) */}
          {cycles[cycles.length - 1]?.paraphrase && cycles.length < maxCycles && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 text-purple-800 mb-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Your Turn to Share</span>
              </div>
              <p className="text-sm text-purple-700">
                The last statement has been paraphrased. You can now share your perspective by adding a "Because" statement above.
              </p>
            </div>
          )}
        </div>
      )}

      {cycles.length === 0 && (
        <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
          <p className="text-stone-700 font-medium">Begin Communication</p>
          <p className="text-stone-600 text-sm mt-1">
            Start the conversation by sharing your perspective with a "Because" statement above.
          </p>
        </div>
      )}
    </div>
  );
}

// Follow-up Step
function FollowUpStep({ conflict, user, canEdit, onUpdate }) {
  const [ratings, setRatings] = useState({
    processSatisfaction: 0,
    feltHeard: 0,
    partnerHeard: 0
  });
  const [hasRated, setHasRated] = useState(false);

  // Check if user has already rated
  const followUp = conflict.steps?.followUp;
  const userRatings = followUp?.ratings?.[user.id];

  React.useEffect(() => {
    if (userRatings) {
      setRatings(userRatings);
      setHasRated(true);
    }
  }, [userRatings]);

  const handleRatingChange = (category, value) => {
    setRatings({ ...ratings, [category]: parseInt(value) });
  };

  const handleSubmitRatings = async () => {
    // Validate all ratings are set
    if (ratings.processSatisfaction === 0 || ratings.feltHeard === 0 || ratings.partnerHeard === 0) {
      alert('Please provide all three ratings before submitting');
      return;
    }

    try {
      const updated = {
        ...conflict,
        steps: {
          ...conflict.steps,
          followUp: {
            ...conflict.steps.followUp,
            ratings: {
              ...(conflict.steps.followUp?.ratings || {}),
              [user.id]: {
                ...ratings,
                userName: user.name,
                userEmail: user.email,
                timestamp: new Date().toISOString()
              }
            }
          }
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      // Check if all mentees have rated
      const allRatings = updated.steps.followUp.ratings;
      const ratingCount = Object.keys(allRatings).length;
      const totalMentees = conflict.mentees?.length || 1;

      if (ratingCount >= totalMentees) {
        updated.steps.followUp.completed = true;
        updated.status = 'resolved';
        updated.statusHistory.push({
          status: 'resolved',
          timestamp: new Date().toISOString()
        });
      }

      await storage.set(`conflict:${conflict.id}`, updated);
      setHasRated(true);
      await onUpdate();
      alert('Your ratings have been submitted!');
    } catch (error) {
      console.error('Error submitting ratings:', error);
      alert('Failed to submit ratings. Please try again.');
    }
  };

  // Calculate statistics
  const allRatings = followUp?.ratings || {};
  const allComplete = followUp?.completed;
  const ratingValues = Object.values(allRatings);

  const calculateAverage = (category) => {
    if (ratingValues.length === 0) return 0;
    const sum = ratingValues.reduce((acc, r) => acc + (r[category] || 0), 0);
    return (sum / ratingValues.length).toFixed(1);
  };

  const calculateAgreement = (category) => {
    if (ratingValues.length < 2) return 100;
    const values = ratingValues.map(r => r[category]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    // Convert to percentage (lower std dev = higher agreement)
    const agreement = Math.max(0, 100 - (stdDev * 25));
    return Math.round(agreement);
  };

  // Calculate time spent
  const calculateTimeSpent = () => {
    const created = new Date(conflict.createdAt);
    const resolved = conflict.statusHistory?.find(h => h.status === 'resolved');
    if (!resolved) return null;
    const resolvedDate = new Date(resolved.timestamp);
    
    // Parse response hours (e.g., "9-5" or "5-9")
    const [startHour, endHour] = conflict.responseHours.split('-').map(h => parseInt(h));
    
    // Calculate only hours within the response window
    let totalMinutes = 0;
    let currentDate = new Date(created);
    
    while (currentDate < resolvedDate) {
      const hour = currentDate.getHours();
      
      // Check if current hour is within response window
      let isInWindow = false;
      if (startHour < endHour) {
        // Normal range like 9-5 (9am to 5pm)
        isInWindow = hour >= startHour && hour < endHour;
      } else {
        // Wrapped range like 17-21 (5pm to 9pm) which wraps to next day
        isInWindow = hour >= startHour || hour < endHour;
      }
      
      if (isInWindow) {
        // Add this hour (or partial hour if at boundaries)
        const nextHour = new Date(currentDate);
        nextHour.setHours(currentDate.getHours() + 1, 0, 0, 0);
        
        const endOfThisSegment = nextHour > resolvedDate ? resolvedDate : nextHour;
        const minutesInThisHour = (endOfThisSegment - currentDate) / (1000 * 60);
        totalMinutes += minutesInThisHour;
      }
      
      // Move to next hour
      currentDate.setHours(currentDate.getHours() + 1, 0, 0, 0);
      
      // Safety check to prevent infinite loops
      if (currentDate - created > 365 * 24 * 60 * 60 * 1000) break; // 1 year max
    }
    
    const hours = totalMinutes / 60;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return { hours: hours.toFixed(1), days, remainingHours };
  };

  const timeSpent = calculateTimeSpent();

  // Count steps taken
  const stepsTaken = conflict.statusHistory?.length || 0;

  // Calculate maximum possible time given the constraints
  const calculateMaxPossibleTime = () => {
    const maxCommunicateCycles = 5;
    const maxAlternativesPerPerson = 3;
    const numMentees = conflict.mentees?.length || 1;
    
    // Communicate phase: cooling period + response window per cycle (both directions)
    // Each cycle: statement + paraphrase = 2 responses
    // Max cycles = 5, so 10 total responses (5 statements, 5 paraphrases)
    const communicateTime = maxCommunicateCycles * 2 * (conflict.responseWaitTime + conflict.responseWindow);
    
    // Explore Alternatives: responseWindow per alternative
    const alternativesTime = maxAlternativesPerPerson * conflict.responseWindow * numMentees;
    
    // Total max time in minutes
    const totalMinutes = communicateTime + alternativesTime;
    const totalHours = totalMinutes / 60;
    
    return {
      minutes: totalMinutes,
      hours: totalHours.toFixed(1),
      days: Math.floor(totalHours / 24),
      remainingHours: Math.floor(totalHours % 24)
    };
  };

  const maxPossibleTime = calculateMaxPossibleTime();
  
  // Calculate efficiency percentage
  const calculateEfficiency = () => {
    if (!timeSpent || !maxPossibleTime) return 0;
    const actualHours = parseFloat(timeSpent.hours);
    const maxHours = parseFloat(maxPossibleTime.hours);
    const efficiency = ((maxHours - actualHours) / maxHours) * 100;
    return Math.max(0, Math.min(100, Math.round(efficiency)));
  };

  const efficiency = calculateEfficiency();

  const ratingCategories = [
    {
      key: 'processSatisfaction',
      label: 'Overall Process Satisfaction',
      description: 'How satisfied are you with the conflict resolution process?',
      lowLabel: 'Very Dissatisfied',
      highLabel: 'Very Satisfied'
    },
    {
      key: 'feltHeard',
      label: 'Felt Heard and Understood',
      description: 'How much did you feel heard and understood during this process?',
      lowLabel: 'Not at all',
      highLabel: 'Completely'
    },
    {
      key: 'partnerHeard',
      label: 'Partner Felt Heard',
      description: 'How much do you think your conflict partner(s) felt heard and understood?',
      lowLabel: 'Not at all',
      highLabel: 'Completely'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-stone-800 mb-3">Follow-up & Reflection</h4>
        <p className="text-sm text-stone-600 mb-4">
          Reflect on the conflict resolution process by providing ratings. Your feedback helps improve future conflict resolutions.
        </p>
      </div>

      {/* Ratings Form */}
      {!hasRated ? (
        <div className="space-y-6">
          {ratingCategories.map((category) => (
            <div key={category.key} className="bg-white rounded-lg p-6 border-2 border-stone-200">
              <div className="mb-4">
                <h5 className="font-medium text-stone-800 mb-1">{category.label}</h5>
                <p className="text-sm text-stone-600">{category.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                  <span>{category.lowLabel}</span>
                  <span>{category.highLabel}</span>
                </div>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label
                      key={rating}
                      className={`cursor-pointer transition-all ${
                        ratings[category.key] === rating
                          ? 'scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`rating-${category.key}`}
                        value={rating}
                        checked={ratings[category.key] === rating}
                        onChange={(e) => handleRatingChange(category.key, e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center font-medium text-lg transition-all ${
                          ratings[category.key] === rating
                            ? 'bg-amber-600 text-white shadow-lg'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {rating}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmitRatings}
            disabled={ratings.processSatisfaction === 0 || ratings.feltHeard === 0 || ratings.partnerHeard === 0}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white py-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Submit Ratings
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
              <CheckCircle className="w-5 h-5" />
              Your ratings have been submitted
            </div>
            <p className="text-blue-600 text-sm">
              {allComplete 
                ? 'All participants have completed their ratings.' 
                : 'Waiting for other participants to submit their ratings...'}
            </p>
          </div>

          {/* Show user's ratings */}
          <div>
            <h5 className="font-medium text-stone-700 mb-3">Your Ratings:</h5>
            <div className="grid grid-cols-3 gap-4">
              {ratingCategories.map((category) => (
                <div key={category.key} className="p-4 bg-white rounded-lg border border-stone-200">
                  <div className="text-sm text-stone-600 mb-2">{category.label}</div>
                  <div className="text-2xl font-medium text-amber-600">{ratings[category.key]}/5</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Section - Only show when all have rated */}
      {allComplete && (
        <div className="mt-8 space-y-6">
          <div className="border-t border-stone-200 pt-6">
            <h4 className="text-xl font-medium text-stone-800 mb-4">Conflict Resolution Summary</h4>
          </div>

          {/* Time and Steps */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
                <h5 className="font-medium text-blue-800">Time to Resolution</h5>
              </div>
              {timeSpent && (
                <div>
                  <div className="text-3xl font-medium text-blue-900">{timeSpent.hours}h</div>
                  <div className="text-sm text-blue-700 mt-1">
                    ({timeSpent.days} days, {timeSpent.remainingHours} hours)
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                <h5 className="font-medium text-purple-800">Steps Taken</h5>
              </div>
              <div className="text-3xl font-medium text-purple-900">{stepsTaken}</div>
              <div className="text-sm text-purple-700 mt-1">status changes</div>
            </div>
          </div>

          {/* Average Ratings */}
          <div>
            <h5 className="font-medium text-stone-800 mb-3">Average Ratings (All Participants)</h5>
            <div className="grid grid-cols-3 gap-4">
              {ratingCategories.map((category) => (
                <div key={category.key} className="p-5 bg-white rounded-lg border-2 border-stone-200">
                  <div className="text-sm text-stone-600 mb-3">{category.label}</div>
                  <div className="flex items-end gap-2 mb-2">
                    <div className="text-3xl font-medium text-amber-600">
                      {calculateAverage(category.key)}
                    </div>
                    <div className="text-stone-500 mb-1">/5.0</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-stone-200">
                    <div className="text-xs text-stone-500 mb-1">Agreement Level</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${calculateAgreement(category.key)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-stone-700">
                        {calculateAgreement(category.key)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparative Statement */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-green-800 text-lg mb-3">Resolution Achievement</h5>
                
                <div className="mb-4">
                  <p className="text-green-700 mb-2">
                    This conflict was resolved in <strong>{timeSpent?.hours || 0} hours</strong> across <strong>{stepsTaken} steps</strong>.
                    {timeSpent && timeSpent.hours < 24 ? (
                      <span> This represents an efficient resolution completed in less than one day.</span>
                    ) : timeSpent && timeSpent.hours < 72 ? (
                      <span> This represents a moderately paced resolution.</span>
                    ) : (
                      <span> This represents a thorough resolution process that took multiple days.</span>
                    )}
                  </p>
                  
                  <div className="p-4 bg-white rounded-lg border border-green-300 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-800">Time Efficiency</span>
                      <span className="text-lg font-bold text-green-700">{efficiency}%</span>
                    </div>
                    <div className="mb-3">
                      <div className="h-3 bg-green-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                          style={{ width: `${efficiency}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-green-700">
                      <strong>Excellent work!</strong> Given the maximum wait times and response windows, this conflict could have taken up to{' '}
                      <strong>{maxPossibleTime.hours} hours</strong> ({maxPossibleTime.days > 0 ? `${maxPossibleTime.days} day${maxPossibleTime.days !== 1 ? 's' : ''} and ` : ''}{maxPossibleTime.remainingHours} hours).{' '}
                      You resolved it {efficiency}% faster by responding promptly and engaging constructively.
                    </p>
                  </div>
                </div>
                
                <p className="text-green-700">
                  The average satisfaction rating of <strong>{calculateAverage('processSatisfaction')}/5.0</strong> indicates{' '}
                  {calculateAverage('processSatisfaction') >= 4 ? 'high' : calculateAverage('processSatisfaction') >= 3 ? 'moderate' : 'lower'} satisfaction with the process.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Agree & Implement Step
function AgreeImplementStep({ conflict, user, canEdit, onUpdate }) {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Get the selected solution from Evaluate & Select
  const evaluateSelect = conflict.steps?.evaluateSelect;
  const selectedId = evaluateSelect?.selected;
  const allScores = evaluateSelect?.scores;

  // Get the early resolution if it exists
  const earlyResolution = conflict.steps?.identifyDefine?.resolutionCheck?.canResolve 
    ? conflict.steps.identifyDefine.resolutionCheck 
    : null;

  // Get all alternatives
  const alternatives = conflict.steps?.exploreAlternatives?.alternatives || [];
  
  // Combine to find the selected solution
  const allOptions = [];
  if (earlyResolution?.resolution) {
    allOptions.push({
      id: 'early-resolution',
      text: earlyResolution.resolution,
      createdBy: earlyResolution.proposedBy,
      createdByName: earlyResolution.proposedByEmail || earlyResolution.proposedByName,
      timestamp: earlyResolution.timestamp,
      isEarlyResolution: true
    });
  }
  allOptions.push(...alternatives);

  const selectedSolution = allOptions.find(opt => opt.id === selectedId);

  // Check if user has already acknowledged
  const agreeImplement = conflict.steps?.agreeImplement;
  const userAcknowledgment = agreeImplement?.acknowledged?.find(a => a.userId === user.id);

  React.useEffect(() => {
    if (userAcknowledgment) {
      setHasAcknowledged(true);
    }
  }, [userAcknowledgment]);

  const handleAcknowledge = async () => {
    try {
      const updated = {
        ...conflict,
        steps: {
          ...conflict.steps,
          agreeImplement: {
            ...conflict.steps.agreeImplement,
            acknowledged: [
              ...(conflict.steps.agreeImplement?.acknowledged || []),
              {
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                timestamp: new Date().toISOString()
              }
            ]
          }
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      // Check if all mentees have acknowledged
      const allAcknowledged = updated.steps.agreeImplement.acknowledged;
      const totalMentees = conflict.mentees?.length || 1;

      if (allAcknowledged.length >= totalMentees) {
        // All have acknowledged - set the resolution and mark as complete
        updated.actualOutcome = selectedSolution?.text || 'Resolution agreed upon';
        updated.steps.agreeImplement.completed = true;
        updated.status = 'follow-up';
        updated.statusHistory.push({
          status: 'follow-up',
          timestamp: new Date().toISOString()
        });
      }

      await storage.set(`conflict:${conflict.id}`, updated);
      setHasAcknowledged(true);
      await onUpdate();
      alert('You have acknowledged the resolution!');
    } catch (error) {
      console.error('Error acknowledging:', error);
      alert('Failed to acknowledge. Please try again.');
    }
  };

  const allAcknowledgments = agreeImplement?.acknowledged || [];
  const allHaveAcknowledged = agreeImplement?.completed;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-stone-800 mb-3">Agree & Implement</h4>
        <p className="text-sm text-stone-600 mb-4">
          Review and acknowledge the selected solution. Once all parties acknowledge, this becomes the official resolution.
        </p>
      </div>

      {/* Selected Solution Display */}
      {selectedSolution ? (
        <div>
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h5 className="font-medium text-green-800 text-xl">Selected Resolution</h5>
                <p className="text-sm text-green-700">
                  Chosen by consensus through voting (Average: {allScores?.[selectedId]?.toFixed(1)}/5.0)
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-5 border border-green-300">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {selectedSolution.isEarlyResolution && (
                    <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded text-xs inline-block mb-3 font-medium">
                      Early Resolution Proposal
                    </div>
                  )}
                  <p className="text-stone-800 text-lg mb-3">{selectedSolution.text}</p>
                  <div className="text-sm text-stone-500">
                    Originally proposed by {selectedSolution.createdByName} · {new Date(selectedSolution.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acknowledgment Status */}
          {allHaveAcknowledged ? (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                <h5 className="font-medium text-blue-800 text-lg">Resolution Finalized</h5>
              </div>
              <p className="text-blue-700 mb-4">
                All parties have acknowledged this resolution. This is now the official outcome of the conflict.
              </p>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">Official Resolution:</div>
                <p className="text-stone-700 italic">"{conflict.actualOutcome}"</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Acknowledgment Action */}
              {!hasAcknowledged ? (
                <div className="bg-white rounded-lg p-6 border-2 border-amber-200">
                  <div className="bg-amber-50 rounded-lg p-4 mb-4">
                    <p className="text-amber-800 font-medium mb-1">Your Acknowledgment Required</p>
                    <p className="text-amber-700 text-sm">
                      By acknowledging, you agree that this resolution accurately reflects the agreed-upon solution and commit to implementing it.
                    </p>
                  </div>
                  <button
                    onClick={handleAcknowledge}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    I Acknowledge This Resolution
                  </button>
                </div>
              ) : (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                    <CheckCircle className="w-5 h-5" />
                    You have acknowledged this resolution
                  </div>
                  <p className="text-blue-600 text-sm">
                    Waiting for other participants to acknowledge...
                  </p>
                </div>
              )}

              {/* Show who has acknowledged */}
              {allAcknowledgments.length > 0 && (
                <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="text-sm font-medium text-stone-700 mb-3">
                    Acknowledgments ({allAcknowledgments.length} of {conflict.mentees?.length || 1})
                  </div>
                  <div className="space-y-2">
                    {allAcknowledgments.map((ack, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">
                          {ack.userEmail || ack.userName}
                        </span>
                        <span className="text-stone-400 text-xs">
                          · {new Date(ack.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-stone-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p>No solution has been selected yet</p>
        </div>
      )}
    </div>
  );
}

// Evaluate & Select Step
function EvaluateSelectStep({ conflict, user, canEdit, onUpdate }) {
  const [ratings, setRatings] = useState({});
  const [hasRated, setHasRated] = useState(false);

  // Get the early resolution if it exists
  const earlyResolution = conflict.steps?.identifyDefine?.resolutionCheck?.canResolve 
    ? conflict.steps.identifyDefine.resolutionCheck 
    : null;

  // Get all alternatives (including early resolution)
  const alternatives = conflict.steps?.exploreAlternatives?.alternatives || [];
  
  // Combine early resolution with other alternatives for rating
  const allOptions = [];
  if (earlyResolution?.resolution) {
    allOptions.push({
      id: 'early-resolution',
      text: earlyResolution.resolution,
      createdBy: earlyResolution.proposedBy,
      createdByName: earlyResolution.proposedByEmail || earlyResolution.proposedByName,
      timestamp: earlyResolution.timestamp,
      isEarlyResolution: true
    });
  }
  allOptions.push(...alternatives);

  // Check if user has already rated
  const userRatings = conflict.steps?.evaluateSelect?.ratings?.[user.id];
  
  React.useEffect(() => {
    if (userRatings) {
      setRatings(userRatings);
      setHasRated(true);
    }
  }, []);

  const handleRatingChange = (optionId, rating) => {
    setRatings({ ...ratings, [optionId]: parseInt(rating) });
  };

  const handleSubmitRatings = async () => {
    // Validate that all options are rated
    const allRated = allOptions.every(opt => ratings[opt.id] !== undefined);
    if (!allRated) {
      alert('Please rate all options before submitting');
      return;
    }

    try {
      const updated = {
        ...conflict,
        steps: {
          ...conflict.steps,
          evaluateSelect: {
            ...conflict.steps.evaluateSelect,
            ratings: {
              ...(conflict.steps.evaluateSelect?.ratings || {}),
              [user.id]: ratings
            }
          }
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      // Check if all mentees have rated
      const allRatings = updated.steps.evaluateSelect.ratings;
      const ratingCount = Object.keys(allRatings).length;
      const totalMentees = conflict.mentees?.length || 1;

      if (ratingCount >= totalMentees) {
        // Calculate average scores
        const scores = {};
        allOptions.forEach(opt => {
          const optionRatings = Object.values(allRatings).map(r => r[opt.id] || 0);
          const avg = optionRatings.reduce((a, b) => a + b, 0) / optionRatings.length;
          scores[opt.id] = avg;
        });

        // Find the highest rated option
        const topOption = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        
        updated.steps.evaluateSelect.scores = scores;
        updated.steps.evaluateSelect.selected = topOption[0];
        updated.steps.evaluateSelect.completed = true;
        updated.status = 'agree-implement';
        updated.statusHistory.push({
          status: 'agree-implement',
          timestamp: new Date().toISOString()
        });
      }

      await storage.set(`conflict:${conflict.id}`, updated);
      setHasRated(true);
      await onUpdate();
      alert('Your ratings have been submitted!');
    } catch (error) {
      console.error('Error submitting ratings:', error);
      alert('Failed to submit ratings. Please try again.');
    }
  };

  const evaluateSelect = conflict.steps?.evaluateSelect;
  const allScores = evaluateSelect?.scores;
  const selectedId = evaluateSelect?.selected;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-stone-800 mb-3">Evaluate & Select Solutions</h4>
        <p className="text-sm text-stone-600 mb-4">
          Rate each proposed solution on a scale of 1-5, where 1 is least preferred and 5 is most preferred.
        </p>
      </div>

      {/* Show results if all have rated */}
      {allScores && selectedId && (
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h5 className="font-medium text-green-800 text-lg">Selected Solution</h5>
              <p className="text-sm text-green-700">Based on everyone's ratings</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-300">
            <p className="text-stone-700 mb-2">
              {allOptions.find(o => o.id === selectedId)?.text}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 font-medium">
                Average Score: {allScores[selectedId]?.toFixed(1)}/5.0
              </span>
              {allOptions.find(o => o.id === selectedId)?.isEarlyResolution && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                  Early Resolution
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating Form */}
      {!hasRated ? (
        <div className="space-y-4">
          {allOptions.map((option) => (
            <div key={option.id} className="bg-white rounded-lg p-5 border-2 border-stone-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  {option.isEarlyResolution && (
                    <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs inline-block mb-2">
                      Early Resolution Proposal
                    </div>
                  )}
                  <p className="text-stone-700 mb-2">{option.text}</p>
                  <div className="text-xs text-stone-500">
                    Proposed by {option.createdByName} · {new Date(option.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm font-medium text-stone-700">Your Rating:</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label
                      key={rating}
                      className={`cursor-pointer transition-all ${
                        ratings[option.id] === rating
                          ? 'scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`rating-${option.id}`}
                        value={rating}
                        checked={ratings[option.id] === rating}
                        onChange={(e) => handleRatingChange(option.id, e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                          ratings[option.id] === rating
                            ? 'bg-amber-600 text-white shadow-lg'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {rating}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmitRatings}
            disabled={allOptions.some(opt => ratings[opt.id] === undefined)}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white py-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Submit Ratings
          </button>
        </div>
      ) : (
        <div>
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <p className="text-blue-800 font-medium flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Your ratings have been submitted
            </p>
            <p className="text-blue-600 text-sm mt-1">
              {allScores 
                ? 'All participants have rated. See the selected solution above.' 
                : 'Waiting for other participants to submit their ratings...'}
            </p>
          </div>

          {/* Show user's ratings */}
          <div className="space-y-3">
            <h5 className="font-medium text-stone-700">Your Ratings:</h5>
            {allOptions.map((option) => (
              <div key={option.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-700 flex-1">
                  {option.text.substring(0, 60)}...
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 font-medium">{ratings[option.id]}/5</span>
                  {allScores && (
                    <span className="text-stone-500 text-sm">
                      (avg: {allScores[option.id]?.toFixed(1)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allOptions.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p>No solutions to evaluate yet</p>
        </div>
      )}
    </div>
  );
}

// Explore Alternatives Step
function ExploreAlternativesStep({ conflict, user, canEdit, onUpdate }) {
  const [alternative, setAlternative] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lateReason, setLateReason] = useState('');

  const isMentee = conflict.mentees?.some(m => m.id === user.id || m.email?.toLowerCase() === user.email?.toLowerCase()) ||
                   conflict.createdBy === user.id;
  const isMentor = conflict.mentor?.id === user.id;
  const alternatives = conflict.steps.exploreAlternatives?.alternatives || [];
  const userAlternatives = alternatives.filter(a => a.createdBy === user.id);
  const maxPerUser = 3;

  console.log('ExploreAlternativesStep debug:', {
    isMentee,
    isMentor,
    canEdit,
    userAlternativesLength: userAlternatives.length,
    maxPerUser,
    shouldShowForm: ((isMentee || isMentor) && canEdit && userAlternatives.length < maxPerUser)
  });

  // Get the time when this step started (when status changed to explore-alternatives)
  const stepStartTime = conflict.statusHistory?.find(h => h.status === 'explore-alternatives')?.timestamp;
  
  // Calculate time remaining
  const calculateTimeRemaining = () => {
    if (!stepStartTime) return maxPerUser * conflict.responseWindow;
    const startTime = new Date(stepStartTime);
    const now = new Date();
    const minutesPassed = (now - startTime) / (1000 * 60);
    const totalAllowedTime = maxPerUser * conflict.responseWindow; // 3 alternatives * responseWindow minutes each
    const remaining = Math.max(0, totalAllowedTime - minutesPassed);
    return remaining;
  };

  const formatTimeRemaining = (minutes) => {
    const totalSeconds = Math.ceil(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeExpired = () => {
    return calculateTimeRemaining() <= 0;
  };

  // Update timer every second
  React.useEffect(() => {
    setTimeRemaining(calculateTimeRemaining());
    
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [stepStartTime, alternatives]);

  const handleSubmitAlternative = async () => {
    if (!alternative.trim()) return;
    if (userAlternatives.length >= maxPerUser) {
      alert('You have already submitted 3 alternatives');
      return;
    }

    const isLate = isTimeExpired() && userAlternatives.length === 0;
    
    if (isLate && lateReason.trim().length < 10) {
      alert('Please provide a reason for submitting late (minimum 10 characters)');
      return;
    }

    const newAlternative = {
      id: `alt-${Date.now()}`,
      text: alternative,
      createdBy: user.id,
      createdByName: user.name,
      createdByEmail: user.email,
      timestamp: new Date().toISOString(),
      ...(isLate && {
        lateSubmission: true,
        lateReason: lateReason.trim(),
        minutesLate: Math.ceil(Math.abs(timeRemaining))
      })
    };

    const updated = {
      ...conflict,
      steps: {
        ...conflict.steps,
        exploreAlternatives: {
          ...conflict.steps.exploreAlternatives,
          alternatives: [...alternatives, newAlternative]
        }
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };

    await storage.set(`conflict:${conflict.id}`, updated);
    setAlternative('');
    setLateReason('');
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Resolution from Identify & Define */}
      {conflict.steps?.identifyDefine?.resolutionCheck?.canResolve && conflict.steps?.identifyDefine?.resolutionCheck?.resolution && (
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-lg text-green-800 mb-1">
                ✓ Early Resolution Proposed
              </p>
              <div className="text-sm text-green-700">
                Proposed by {conflict.steps.identifyDefine.resolutionCheck.proposedByEmail || 
                            conflict.steps.identifyDefine.resolutionCheck.proposedByName || 
                            'Participant'} · {new Date(conflict.steps.identifyDefine.resolutionCheck.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-green-300 mb-4">
            <div className="text-sm font-medium text-green-800 mb-1">Proposed Resolution:</div>
            <p className="text-stone-700">{conflict.steps.identifyDefine.resolutionCheck.resolution}</p>
          </div>

          {/* Accept/Reject for other mentees */}
          {conflict.steps.identifyDefine.resolutionCheck.proposedBy !== user.id && 
           !conflict.steps.identifyDefine.resolutionCheck.responses?.[user.id] && (
            <div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-amber-800 font-medium">Your Response Required</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    const updated = {
                      ...conflict,
                      steps: {
                        ...conflict.steps,
                        identifyDefine: {
                          ...conflict.steps.identifyDefine,
                          resolutionCheck: {
                            ...conflict.steps.identifyDefine.resolutionCheck,
                            responses: {
                              ...(conflict.steps.identifyDefine.resolutionCheck.responses || {}),
                              [user.id]: {
                                accepted: true,
                                userId: user.id,
                                userEmail: user.email,
                                userName: user.name,
                                timestamp: new Date().toISOString()
                              }
                            }
                          }
                        }
                      },
                      updatedAt: new Date().toISOString(),
                      updatedBy: user.id
                    };

                    const allResponses = Object.values(updated.steps.identifyDefine.resolutionCheck.responses || {});
                    const allAccepted = allResponses.every(r => r.accepted);
                    const allMenteesResponded = allResponses.length >= (conflict.mentees?.length || 1);

                    if (allAccepted && allMenteesResponded) {
                      updated.status = 'evaluate-select';
                      updated.statusHistory.push({
                        status: 'evaluate-select',
                        timestamp: new Date().toISOString()
                      });
                    }

                    await storage.set(`conflict:${conflict.id}`, updated);
                    await onUpdate();
                    alert('You have accepted the proposed resolution!');
                  }}
                  className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Accept
                </button>
                <button
                  onClick={async () => {
                    const updated = {
                      ...conflict,
                      steps: {
                        ...conflict.steps,
                        identifyDefine: {
                          ...conflict.steps.identifyDefine,
                          resolutionCheck: {
                            ...conflict.steps.identifyDefine.resolutionCheck,
                            responses: {
                              ...(conflict.steps.identifyDefine.resolutionCheck.responses || {}),
                              [user.id]: {
                                accepted: false,
                                userId: user.id,
                                userEmail: user.email,
                                userName: user.name,
                                timestamp: new Date().toISOString()
                              }
                            }
                          }
                        }
                      },
                      status: 'communicate',
                      statusHistory: [
                        ...conflict.statusHistory,
                        {
                          status: 'communicate',
                          timestamp: new Date().toISOString()
                        }
                      ],
                      updatedAt: new Date().toISOString(),
                      updatedBy: user.id
                    };

                    await storage.set(`conflict:${conflict.id}`, updated);
                    await onUpdate();
                    alert('Resolution rejected. Moving to Communication step.');
                  }}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Responses Status */}
          {conflict.steps.identifyDefine.resolutionCheck.responses && 
           Object.keys(conflict.steps.identifyDefine.resolutionCheck.responses).length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-stone-200">
              <div className="text-sm font-medium text-stone-700 mb-2">Responses:</div>
              <div className="space-y-2">
                {Object.values(conflict.steps.identifyDefine.resolutionCheck.responses).map((response, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {response.accepted ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={response.accepted ? 'text-green-700' : 'text-red-700'}>
                      {response.userEmail || response.userName} {response.accepted ? 'accepted' : 'rejected'}
                    </span>
                    <span className="text-stone-400 text-xs">
                      · {new Date(response.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h4 className="font-medium text-stone-800 mb-3">Explore Alternatives</h4>
        <p className="text-sm text-stone-600 mb-4">
          Each participant can propose up to 3 potential solutions. Be creative and constructive.
        </p>
      </div>

      {/* Existing Alternatives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alternatives.map((alt, idx) => (
          <div key={alt.id} className="bg-white rounded-lg p-4 border border-stone-200 overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-stone-700 mb-2 break-words">{alt.text}</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-stone-500 mb-2 gap-1">
                  <span className="break-words">By {alt.createdByEmail || alt.createdByName}</span>
                  <span className="flex-shrink-0">{new Date(alt.timestamp).toLocaleString()}</span>
                </div>
                {alt.lateSubmission && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1 text-xs text-red-700 font-medium mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Late Submission ({alt.minutesLate} min late)
                    </div>
                    <p className="text-xs text-red-600 italic break-words">"{alt.lateReason}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Alternative Form */}
      {((isMentee || isMentor) && canEdit && userAlternatives.length < maxPerUser) && (
        <div className="bg-white rounded-lg p-4 border-2 border-dashed border-purple-300">
          {/* Timer Display */}
          {stepStartTime && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-purple-800">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Time to Submit Alternatives</span>
                </div>
                <div className="text-lg font-mono font-bold text-purple-900">
                  {formatTimeRemaining(timeRemaining)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 transition-all duration-1000 ease-linear"
                      style={{ 
                        width: `${Math.max(0, (timeRemaining / (maxPerUser * conflict.responseWindow)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                {isTimeExpired() ? (
                  <span className="text-red-700 font-medium">⚠️ Time has expired. You must provide a reason for late submission.</span>
                ) : (
                  <>Total time: {maxPerUser * conflict.responseWindow} minutes ({maxPerUser} alternatives × {conflict.responseWindow} min each). At least 1 required.</>
                )}
              </p>
            </div>
          )}

          <div className="relative">
            <textarea
              value={alternative}
              onChange={(e) => setAlternative(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
              placeholder="Describe a potential solution..."
              rows={3}
              maxLength={500}
            />
            <VoiceInputButton 
              onResult={(text) => setAlternative(prev => prev + (prev ? ' ' : '') + text)}
              className="absolute right-2 top-2"
            />
          </div>

          {/* Late Reason Field - Only show if time expired and no alternatives submitted yet */}
          {isTimeExpired() && userAlternatives.length === 0 && (
            <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <label className="block text-sm font-medium text-red-800 mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Required: Explain why you're submitting late
              </label>
              <textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="Example: I needed more time to think through the options..."
                rows={2}
                maxLength={200}
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${
                  lateReason.trim().length < 10 
                    ? 'text-red-500' 
                    : 'text-green-600'
                }`}>
                  {lateReason.length}/200 characters {lateReason.trim().length < 10 ? '(min 10)' : ''}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">
              {userAlternatives.length}/{maxPerUser} alternatives submitted {userAlternatives.length === 0 && '(at least 1 required)'}
            </span>
            <button
              onClick={handleSubmitAlternative}
              disabled={!alternative.trim() || (isTimeExpired() && userAlternatives.length === 0 && lateReason.trim().length < 10)}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add Alternative
            </button>
          </div>
        </div>
      )}

      {alternatives.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p>No alternatives proposed yet</p>
        </div>
      )}
    </div>
  );
}

// Conflict History Component
function ConflictHistory({ conflict }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-medium text-stone-800 mb-4">Status History</h3>
      
      <div className="space-y-3">
        {conflict.statusHistory?.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 bg-stone-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-stone-800 capitalize">
                {entry.status.replace('-', ' ')}
              </div>
              <div className="text-sm text-stone-500">
                {new Date(entry.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {conflict.comments && conflict.comments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-medium text-stone-800 mb-4">Comments</h3>
          <div className="space-y-3">
            {conflict.comments.map((comment, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg border border-stone-200">
                <div className="font-medium text-stone-800 mb-1">{comment.author}</div>
                <p className="text-stone-600">{comment.text}</p>
                <div className="text-xs text-stone-500 mt-2">
                  {new Date(comment.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}