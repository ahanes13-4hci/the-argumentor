import React, { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle, AlertCircle, MessageSquare, BarChart3, FileText, Plus, Send, ThumbsUp, ThumbsDown, User, Settings, LogOut, ChevronRight, X } from 'lucide-react';

// Utility function for persistent storage
const storage = {
  get: async (key) => {
    try {
      // Try window.storage first
      if (window.storage && window.storage.get) {
        const result = await window.storage.get(key);
        return result ? JSON.parse(result.value) : null;
      }
      // Fallback to localStorage
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  set: async (key, value) => {
    try {
      // Try window.storage first
      if (window.storage && window.storage.set) {
        await window.storage.set(key, JSON.stringify(value));
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
  list: async (prefix) => {
    try {
      // Try window.storage first
      if (window.storage && window.storage.list) {
        const result = await window.storage.list(prefix);
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
  }
};

// Main App Component
export default function TheArgumentor() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [conflicts, setConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      console.log('Step 1: Listing conflict keys...');
      const keys = await storage.list('conflict:');
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
          console.log(`  -> Fetching ${key}...`);
          const data = await storage.get(key);
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
      {view === 'login' && <LoginView onLogin={handleLogin} />}
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
    </div>
  );
}

// Login View Component
function LoginView({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('mentee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log('Login button clicked');
    setError('');
    setLoading(true);

    try {
      // Get all users from storage
      console.log('Fetching all users...');
      const allUsers = await storage.get('all-users') || [];
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

      // Get existing users
      console.log('Fetching existing users...');
      const allUsers = await storage.get('all-users') || [];
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

      // Save to all users
      const updatedUsers = [...allUsers, newUser];
      console.log('Saving updated users:', updatedUsers);
      const saved = await storage.set('all-users', updatedUsers);
      console.log('Users saved successfully:', saved);

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

// Dashboard View Component
function DashboardView({ user, conflicts, onLogout, onSelectConflict, onCreateConflict, onRefresh }) {
  const [filter, setFilter] = useState(null);

  // Reload conflicts when dashboard mounts
  useEffect(() => {
    console.log('Dashboard mounted, conflicts:', conflicts);
    if (conflicts.length === 0) {
      console.log('No conflicts found, triggering refresh...');
      onRefresh();
    }
  }, []);

  const userConflicts = conflicts.filter(c => {
    // Check if user is a participant by ID
    const isParticipantById = c.mentees?.some(m => m.id === user.id) ||
                               c.mentor?.id === user.id ||
                               c.flyOnWall?.id === user.id ||
                               c.omniscient?.id === user.id;
    
    // Check if user is an invited mentee by email
    const isInvitedByEmail = c.mentees?.some(m => m.email.toLowerCase() === user.email.toLowerCase());
    
    // Check if user created the conflict
    const isCreator = c.createdBy === user.id;
    
    // Admin sees everything
    const isAdmin = user.role === 'admin';
    
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAACqQ0lEQVR42u29d7xtyVUdCo+qFXYO59zQN3T3vZ1zq9WtTJBkCWEJPYGwDRh4gLF58LCNjSPGNsafsR+fs3m2sYlPCBtjLBFEkEgC1ApI3eqWOuccbjpn571Xqvr+WDVrz1W71j6nf++7/sl9OfesVavCWjVqzjHGFBcvXtRKKbTbbbRaLQBAkiSYTqcQQiAIAgwGAwCA1hqTyQRaayil0O/3EUURAGA+n2O1WgEA4jhGr9eD1hp5nmMymUAIASEEBoMBhBAAgOl0ijzPAQCdTgeNRgNCCCyXS8znc0gpEQQB+v0+AEAphfF4bJ+l3+8jDEMAwGw2Q5qmAIBWq4V2uw2tNdI0tX2h9unPeDxGURQAgF6vh2azCQC2fbcvRVFgNBoBAIQQGA6HCIIAQghMJhPbPh/L1Wpl+x+GIYbDYWUslVKQUkJKCaWUff5mswmtNZIkwWw2AwCEYWjHT2uN0Whkr+n1enYuFosFlsulfX4av6Io7PwBwGAwQBAEALD5/O02NEz70xmkEJBSVtofj8fQWkNrvdE+XwudTse2Px6PIcy9+v2+XQuTyQR5nkMIgXa7beditVphsVjY8et2u3YtTCaTA9dCs9lEp9OB1hpZlmE6nQKAdy80lt1uF3EcQ2sNsVqttBACaZoiyzL7UsRxbB9ktVrZBdZoNCCltJNHNw3D0F6TZZl9wCAI7MLXWtuJo4eXUkIIgSRJ7MsSRZEd7DzPkaapHUgaOHqRlVLQWiOOY+81Ukr7XFprOxEA7HNR+9QXt/0kSexL0Ww2bV/o57QQaLElSWJfPCklGo2G/ai4faF7aa3t9TQXND98Lvj19Pxum1EU2cVSFIW9huaP2qSx0Fqj0WhU2k+zDJACYRCgEccQEJW1oLW280cLuW4ukiSxc0F9pnvRy8rvlaapXQthGKLRaGzMBY0r7wvdi/rC1zVfi+665vMnhMBqtbJjGUZRBPcFkVIiiiK7A+R5bh++0+nYvy+XS9u4u6joa0D/Rg9Fg0idDMMQUkqsVquNe9HC4c8VhqG973K5RJ7nUEqh2WxW2qdroiiyXwOllO241hrtdtveb7VaIc9zaK0rfSmKwvaFxoUmZbFY2JeKt58kie1Lo9Gw7WdZhizL7EchCAIEQYCiKGy77gtCfeDjSn/a7ba9lzsX9FLRs9DzdzodO36LxcK2zZ/frgUpEEiJKIohnPb58wshsFgsbDt8zouiQFEU9uf04kopK32hsXWfOQxDew2fP6XURl9obVFf3BeE7sefi9Ziq9Wya4GvuVADgAAUNNw/1DgtKP5f9+/8Dy1sut53jfuzbf83f5a6+9b9cZ+FFrR7T/677n0JBrljUjcO/B6H7ZvvvvzfqQ+8L277fDeqGwvfc/p+XnZcA0pDOP9W9xzu+Na1v61dd8351tJh57/uGX19qRsnMZqMdbm9h4iCAAICeVH9UtDXiOAT3SAIArtw+JeCvvQ0YO7XkB6Kvv70xQmCwGJ9ap9/WejNpj+0+9BzKaUqXzbePv+C0d/5vfg1/Ln4V4eeue5edE0QBAjDcGPXomfj/aeXg84gWmt7JuF9dseVvvS+seC7Ht+BDho/Pq80F0opFHkOYWA1nz+6F/85Xwvu/PnWAl9XfC5o/Pi9CAq596Kfu2uBoxQhRGVd0ZqjZ6axpL7QvcI0TQ3cCEt8r4FiWWC1WtmbcwxPWxkd0unf5vM5kiSxOJNwd57nWCwWdlA4LBiPxxbWNBoNiw9pu6ZJ5AezxWKxsS1a3Gz70rb3SpLEdp63TxCNFiU/pM/nc3tNFEX253me2zOU1tq2TxiY2u92u7b/SZLY/kdRhG63axce4WZa/DQW/JCapmnlejpw0nPSF5agHIc7dB6gsSiKwt6Lnp9eWD5OfPxWqxXmZl6llOh2u16ISfMnhMB0OrX3op/TWpjP5364R7ifxo/3hc5Q7nmMDu90sOZnKDqrUMCD1gL13wc3aS00Gg00m80SOUCbbVRX4Qjf9n1QaxsE4/cAAA0Nbf5bt93zs0nd9rkNPhzm2Vw4UwdVaAHTM/m2/W2woe45ORTicKjumm1Q6iCYdND81I3tNmh7GOhW147bF99817V/EEzdNicHwaltMBAAxGw2074FySdxG4b1LbwKJravSHnWEWp9Le0kHLvygeTt1y0O/juHOR/UYX+CZy7mPWjRudf4rqd+HubM5PvD4RaNE41fHd6uW9iHGb9tL4k7L9vG1ndmoDHnHx/+O9vON7wvtAvR79M5cdu5hrd/0LjY9VEUhRZCYDabYblc2lAmwZo8zzEajWzjg8HAPthkMrFQqNvtotVq2a3Xxq6jCP1+r9xBtMZofwRtJnk4HFp8OJ1ObdiNYtcUhaDYOeUeqDOUx6BtmecxCIpRHoDwLOVRqH1fHqDVatn2V6vVRk6IJng0GlVyQpS7cPvCx5La53F4Wiw8IkRQrtFooNfrWYi0v79vJ3BnZ2cDrhJEarfblZwWTfjOzo7tP+VRCGJyiLtcLi3coPHjz+/Lo3CISO1TTokWNM0fzQUt1MFgYM8ks9nMQiQ3j0E5JSkldnZ2Kjkhdy3QWBKsojwSjSXltHhfeE5LCIHwMNGOuugPTTT/qvEvvhAC0BoCAkIAhdKA+fK5v+t+mXxfkG3QqPIFgIbSClpvwprX8uewUbI6CHWYr+22SN+2v7v3ey19c8fx/x+w1feF37b7HiYK6kMOvrE9TATvMGPkHi0AQMznc01vFN+C6G1yowj0xXC3SReu8IiMjbxojZzdSwgBIQWkkCiKohJ5oPYpCkTt0M/pi8zhBj1boRQKZSJHKJNdNIBuX+hl5ZGrjfaVsqFOaoOuce/F+89zAm5Ei66pe5H4RPM26yJyLqbnUTxfHsI3fvz53XvxufD1mXYPHjmi8ebwOfDMhda60hd+L7rGBxcPOxcc9nJYyiOS9FxCiGr758+f11prdDodtNttm3SazWaVbZEaI1hB2xLfFgkiUcdHo5HtGEE02papfXdbHI/HgC7PNIPBwE44RU041mi2W5bekCYJppPpRl9ciMEh2mw2w2KxsNlaomrkeY79/f3KtkztU1+EEHYseV8IQrkQgxYUT5zRs1B0jGgv/Pk5VYWoFhThmc1mWC6WgChfTho/mj+6nj+/SzWh8UuSpDJ/dRBtMBjY9glicojIIVodXKYPC18L8/kcs9nMMiLcvtCLRmvRjaIRXKaI4mQysePNaU8E15VSNqJpPhzyNcEKWmj84OjbVg/azrTW5aFdSkAcDFvWNwYghT3T+G9e7lYUNCsDBK8NXgkhABNkoFaU1hCy3PXqxuU1t1EzptvmhO/Ym9HCcly1ODiydZg5r7uHG63UWlfGauu9BDaimgcFBfgB3P7Xzm15r8NEXw8Dtfm/h2EY2qQQvXVKKbsz0EGZttjKFl3klbMJ/Rv/Js/zSkKIeDkAIIOgfEHMYLnJGs6TKiNiGoFpI2Cw0E3oCQBZmtldJ4rNvSAqyS0OsXzcKgAQUiBJE/vVl7QV63JHIZjg3ouPJd++eR/5zzksUUohSRL7dz4XHGK5sChNU2jzIkdRbM97vM98/lxYy/NdNBY05+7z8/mmr3iSJhAQ0AKVZ67cK4oAWc5SluWQDsSRsoTbdA0FCty1QOOqBRDoAFppbxKSdmG6hicHXaoLh6sxd8ajWC4bl25CWyxFflwGJvFiCFZwWBCGYYWNyyMH/UEfYRRBQGBeA9H4tggh0B/015GT0RhFXkBptRGFochF3IjRM1EYVShMDKxRSlW25dFoZF/qVqtVJvSgsVytKnCTonhaKezvrSNK/X7fts/hZqPRsFGsNE034ApxsYqisM8yn89tFNDHjKaXYjAYIJABIMq5SNIUGmUUqdPuAA6b2cdgpY8Mh2huFMtlM3NmdCADABrjyQRZUWL3TqeDTqttFye1H4Yh+sMBhHmJxyMDl00UjThrLkSi8eNwDwAGuyaKB2A6XkfRaC1orTfGkiJydcxwDtE2olju1uNuVd4EldnSt0WaKvF2++8MDgl/ZGa9JQv7awJiY7sWqM9Z6A3sZbZ2z/a7wbfSPugGM6mobPuVsTNb/rYEHodTlSjQlufzRoKEAz/1OpInzNi5cIzfj1Nc6ubfncfK3Ao7CbWJuzIYI9fDaaKboGvts2svhASDUiyrBqF1ZU3UQSoX+m5EqmpglxACoXuSp3+g7YcSMJxnY5M5UkAggNAaWqASlaBrCJpYuBGyiITSUE5Ui7ZaG2GBhgyDciCEQKEK+2LyzrsRFg736bylVAkhAK0BaA0lABkIaKjKS87by/Mc0HodeeaXZ5ZaQ5p1o6FRKGXbLPS6b3me2LEkqJXnueVi5ZyzBhStqSzPobXa8EblYzSbTi0sD6TA3vNXopYQCiIpKsISWhO0prgs5yT4a69VpRAQ1M8gCOwc08dCa40iK+y8BmFg109R5CjygqDZxlrI89y+NHTNZDIBZABooNXrImBr0cwffd2zvIDKC4RhiCCQ1bXQ7VXagyjXNmC8nxlQEGY8Cm3WWlFoaLH+4EmlfQiBlEcOSHCjtUa322VJAR2Dy6WFQ00SbGcIrVbLJsqklAjkeoLo0EgH+DRNLVuRt0M8nSCq+EKhfO2kSTIBN/aCQ0cHoQiihHFkByOHk0ppC4s4aVA6OBXGnqwxmZCOgkM0agNwvlgaBkqqoky0Ofc0jh1hKGG11upCCpPJxPJt+MBylp+bTONsZGpf+BSFUu4NNQb/i4U3qY0kTezYRs0I7W4HOiqhZJqmmE1nAMyc8hR/JSSPC7aZQhcoZGkhkCeJhUi+sXTHguCZu7Z49Mdtnxy3pJSWoJcvE0sADQBYKmWfQUMjCNbzF0gJKQWEBPJCIXXWlK0Lp/8crhMscj96hJ+zPIfeWBecZuzTsVB/oijCrklg0ovSH/YrzxlFEbrONhwE69K/PMrlkgLpxeUvUP/AB2oymViY0m6372CASq8XLlC7vv+/riwJVWutE1IUSlVI4LwvRETlLFh++flvKYptdbL+v7RMVJ43CGRF9gvY+aNr3KS0zxXEZx9VGa/Nv/uK4lQiwcbQw9fnpXnxjy+vWHyYvpBK1LWiWk5wQ8J0YfO8eC7wt0G/iuGf0BokPea7qVsHqY4m5O7oh+3LYcbXfZa6sbWQS1nZOXfjueRFHinMn6KoDN62l5X/GUz7IjCQ6CDoxO/Fobp3LWwl/0mBtR+xUO5YOGUhfD8Xou/+//7f//f/xvV1/PnpAaRzeDvoYHYQJtf/b6KhSh9qB/Wgn911RfBFTOiZD+qsj/r/Xe8cro2sG0vfz+quy/Ncm0VMb7BPp0ATwMNx1AGCYRyPQz+nrZZrHjgkojaTJLELA3DP/DSIzS/N09TOJxd6GvJwjcU2GXBdWaQUMbMkPlfCzCM7lL8P/dztizuWPseag+rbuM/E584nUa+jqj1M/w+zfrae37Hf5+mHb6+8fJ//3MfqqXOC+TZ3wTaI5/tZtf1mEwKQRg1bBzF4W90D3w2Df4vcr+JDZuu3/f1h7+X7/2E2I984u0R+n4x5o/I6V/8Hdcg7fvw53PF3f2X+t1p7V6Bexfu51mfj/YnCcH1eqnE1+TZ/pPmP6n5fP9x7H/Y5f0B9qm1b1C9C+v+gfz/Mx8Ed5zq2+LbDZxBECI5HqxZ6T/Hd75//+3//X1CbwkkbEUbBhqLPjdlz0hIFr/iEusrBujb486NKhHK3e99ttvV5W2SDkxHrEqTbs/XuPd1xqBsr/rP1WJb2POu2t60F3hff9b7r+c+r8Q/PvFVqiHEduQ/Lye0vFAJSVrlP28J4vrH3QTa+FlxZ+E9u2HbX/fu/+Zd/+Vf37dun14pixyRnI3rZ+QQ6b0C1jRpXjTpYtE0FdFDbB/2/bt7eBCuCL8LDNLvuvfn/fWNzEIz0QbMrJVH//4MSf24ElFdLqjNa+zH92Qb9Dpo/397Ix+qwscyt9vlHP9O1Y7LtvveOiHRr6vzDv/ff/mt69epVK4V0FXjuF93+WV2I8pOqpPKTpw+6NnPfWQcxtunYt4G+g+r+cVh32/Xu+B10P37/N9J/2joPGru39n6b9/lB9v21/M+P8u/qoJj0Km65e7hvDni7vI2fPXv2Y/7z/+Vvf1++fv1K+wyg+E7lu+92CNS+mfeDN/o7/+cg2LSt/Y+rMNs2LnfLLv5h3Nt+AH+0fv7d0vc/z776/OHrf/0X/tNyPH/rb/3H/MfW/+FH7zd//P/7z+78O0J9dXjkfcpT/+H/1n/1f7Ov//f+yd/+j+79uq0W/tX//R/+xz8TAKA0kKgVlBJQWjrNApSv/b/8Y//X/7/+j//f/uk//l/8xq+JEKYv//X/+D/+3xz0v/v9F0+eFI1GfvS/+X////zjdvP7lc/cVv/0/Pnn/qf/2v/mv/Af/tP/4D/75//Z/+z//F/68xvX/+OG8N/45V/+pV/+g3/4D//Lf/wv/Yf/+e/80/+7/x///3i6//v+T//W+fNn/+C/9nd+5R/8rf/q//Z/+Hf+l/+Pv/rP/cPfP3/5b/8Bf+4f/+N/9I///f/if/xf/if/2//H/+f/x9M/+pf/zv/5H/0d/+JP/9N/+B//o//y//P/+p/9i/9S3c//Qfb5/+5f/O2/+Pt/+++d/0dv/Ib/zV/8vf/jz/3b/+3/8X/w3/7b/+1/8O//53/nr/5f/++v/Xv/L/+3/9r/8W/9g//xf/u//F/+xf/g//yjf/j/93/5r/5w/vp/Zn/nv/13/+7//B/+o//kn/v3/o//0//k//Q/+m/+7v/rO/+//o//1//1/+T/5P/8//rP/8//4f/o//J7X/e//4v/+1/66//FP/gv/w//r//zf/tf/rX/0//7D/Xv//N//w/+8V/64z//4//lX/y7/91//g/+l3/5f/W//i/+f//93/t//lD+/T9cf/hP/mf/+D/8V/+jf/gv/d//7//P//xf+yf/6f/uX/tn/r3v/e/+wf3VP/5Lv/b/+Cd/52/+Y//H/+5/+d/8p/+X//L/8w/y7//h+Yv/4O//3//H/+Cf/E//L//t//Xf/Rd/9//8e//nv/R//K//8G/e+fn/9B/8p/+H/+E/+M/+m//of/bf/Df/0X/x3/rb3/3f+8P/s//kf/7f/bf/yf/z//H/9H/9F+5++Ufh5/7t/+K/+F/+2//T//1//s/+R//C3/g//W//yO/+w9/7Qfz93//Z/+Jv/ff//b/+j/43/97//B/9F/+9/9E/+yv/1//0u/r8/+j/+V/+zX/h7/6n/89/57/+v/wn/5v/1//u5f/w//u9f/69+//8+S/+p/+Tv/7f/i//4t//x//Yf/t//W//L/+tf/jf+df/1//Dj/wP/1/+/u/81//gH/yf/6f/0f/B/+lv/Hf/xH+v//1//X/57/57//n/++/+n/8vP3r//B/L3/tn/r1/6R/+7f/+//Xv/G/+j/+dv/9f/uW/9D/5n/2F/8uf+YP/+39Y//7/8X/4L/xf/pX/+P/y3/17/+v/+3/9H/5X/3//1n/z2v3f+2f/o//4P/wv/h//1b/zX/6v/3f/2/+P//kv/jN/7u+9dv/3/9l/81/+b/4f/8b//j/+W//lf/mP/9/+v/+bN3/+v/v3/r1/+V/+u//4f/yP/rHf+yf/wI/893+sf+Ef+7/8f/6Nv/U//Vf+2//g7/0//1//k//6h/f3/49//f/xX/x//e3/+3/17//X/81/9f/xj/yPfuMP9Pd//x/9o//27/9j/+jv/o2/9T/59/+X/89/97/7a//ID/3f/+f//N/9R//E//of//f/xb/4v/lv/4//T9///f/L//if/V/+p//8f/If/C//4e//3V/8d37vf/m/+R/9v/7x//KP/O//X/+Jf+qP/fO/9X/6J/+Vv/Jf/at/9+f+/D/13//P/9o/+c//j/+b/+Rf+G/+4v/xf/N/eO3//h+/v/xf/jP/+L/3H/w//xv/5D/9V/7h/+bv/Eu/+w/9G//Kf/Tn/j9+cP/+H/hf+d/89f/h3/hH/uP/+j/+u/+v/8d/+n//v/3b/90P5e//P/6v/8W//bf+x3/zP/qn/g//1P/7P/n3/s//y+//3//Vf/mv/M//o//Zf/s//u//5X/z//b99v/3/vy/8S/+5//o7/6L/8bf+T/9R/+X/+Cf+Tf/xv/0h/L3/x/+L/+P/+Hf/bv/6N/6n/+H/86/+I/+h//gv/o//MHv/9/89/7pf/b//g/+j//l//Z//d/9V//Ef/G//Y8uf/4//ct/+X/49/7p//jv/pf/3X/wn/2P/5X/43/0f+b/9T/7c//y//q3/t//B//gf/l//R/+h/+D/+Z/+vv/+/+H/8Z/+P/0f/jf/vP/zPXf+7/87f/R//W/+5/+/f/qb/x3/+Pf+5f+r//8//q/++3/7vf+5v/8D/43f+m/+V/9v//v/67/0/bP/1P/m//v/+jv/Jf/0n/1//i//n//V/+r/9e/8n/6u/+Rf/Zv/qf/5/+3/8f/x//qV//u//j//Tv/L3/65/+F+7++79Pf/pv/p//if/8f/P//A//s//g//V/+M/+2//Of/w//p/+xz+Uvf9H+e//43/n3/gv/st/6u/9/f/iv/4f/t3/55//F//I7/6f/o//y3/5P/iu/u7/03/lf/Zf/s//23/1//x//K/+97/59/+Vf/O//pf/+s1//9/6m//x//zv/If/6X/wP/k//Z/+L3/v//Mv/K//W7/71/6+/+rv/P3/7T/8t/7ef/YP/Zv/0//7e//7/+Xf/x//0//wv/wf/J/+7v/x+/v7//t/8e/9Q//of/x3/7f/y//r//1/+o/+1z+wP/+P/sf/lX/yb/69v/P//P/8L//O//n/8P/8x/+f/hX/u//hf+rf+Uf/13/uf/x3/w//j+u//vf+43/57/w3/5f/8d/8T/+r/+Tf+Bf+x/+u//Zf+mH9/f/f/9v//e/+f/4X/1n/5X/43/2v/3P/1f/w//8f/E/+y//5Z//n/yRz9//YP78v/Yv/c//4d/+L//R/+a/+Z/+r/7H/+lf+i/+T//Jf/1/+v7/ff+M/8v/+T/8+/+b/+n/7b/5v/+f/x//o3/9//Tf/9c/rJ//T//2f/e//P/+O//X/9l/9F//B//5f/bP/Qf/w3/xf/4X/uX/7e//5V+//vt//z/4l/+j/+N/+V//rf/X/+V/+M/+F/++//1/+T+8+ed+/1f/X/9v/92/9d/9V//N//jv/0//17/0j/3ff+/f+/P/xT/xw/n7fxB/7//4X/2n/89/82///X/wf/2f/Dd/99/++3/13/4f/0//x3/5rV/7d/4//Nt/7+//G//G//n/8I//f/7n/6v/+++//f/9H/yf/sP/x//wr//lf+r/+Z/8D/83/8M/8qN//j+un/tL/+bf+O//vf/if/1f/P3/6j/8p//Nf/w//A/+j/+b/9l/+l//y7/+P/2nf/X/+drf/yd++9/4f/79f/Vv/lf/w//7//1/+B//o//xP/9/+Uf+uT/wp/7TP/2n/sUf+9/+v/6rf/vf+o/+hf/4//n//Bt/68//5f/0X/ru1/u/+vf+/j/3T/83/7n/8L/8+/+Lf+l/9J/83v/+D+/P///+c3/n//nv/S//jv/9f/rv/Ff/7d/+r//xv/Z/+df//3/+w//zf/hf/m//s/+q//if/Ff/N/+P/4v//Of/Lv//F/7/H/0v/yH/vv/8T/+P/wHf+c//m/++n/69/7hf/W3/u/f+9//z/8z/5//4T/8B3/xf/P/+IU/+Bf+h//s//b//O//j//Ov/Vf/h/+i//J//XW+f/L/+X/9k/8M//kf/s//h/+X//Tv/Z/+T//1f/o//H/7Qfx5//X/+H/7j/8r/71v/O//u/+3b/99/5X/9D/7f/6g//7f/h+/v1/8O/91//cf/R//C/+e//V//X/99/+o//xP/pb/1//zu/97//I/P0/CH/pf/HX/+O/8Td/7x/+i//iv/qv/5f/9v/1//Y//AP/+x/Yv/f//T//P/8b/4e//l/8lf/V3/jf/I3/x//x//J/+d3/3f/47/zR/+2//X/5F/+5/+EP4s//P/7F//J/+i///b/8X/yt/+a//S//9v/tv/nf/Pv/L//Yjp//cfnL/9zf+M//b//4P/z3/5v/+l//O//Vf/7f/Bf/1T/2X/3x/+1//p0//t/6T/8P/+h//+/8vX/9b/w3/+7/+5/83/53v/vT//Z/+NP/8e/88f/qH/0//+D//D+Tv/Qf/y//1b/8L/+tf+U/+T/9D//B/+w//t/+f/7O//k//Z//c//k//b/9L/9f7n++7/xd/57//W//N/+i//tP//1v/+//V/9m//q//t/8j/4D/6Tf+j//K/97u/nt/6F//h//j//A3/9f/k//ef/6X/wP/tf//d/5b/5//vD//v/TP7i//zX/vv/w7/9n//9/+7/9p/93X/n//7f/p3/43/3//yu//u/+bf/4X/1X/6P/u7/7T/5O//Ff/t3/sY//qP3+//oX/jn/u1/5v/+N/7O3/43/tbf+G/+R//Y//jf/B//1D/1f/jX/u+v//2f+2f/+d/+v/1//av/+t/92//Ff/Qf/Y/+P//Gf/WX/spP/tKv/MG/95f+67/53/xz/+f/4f/5X/8X/9W/+m/8/f/+zb/+L/09/+O/+B/+X/6Ff+e//M/+g3/sl/7B9/rvf//n/q1f/WW/+mv/8T/8T/4///3/6r/5j/7e//p/89v/9D/7L/xH3/vv/8N/4e/97b/xP/r3/tY/9l//w//u//R//OP/9e/c/v//+D/1V//xX/+Hf+U/+B/93/4n/+zf/t/8y3/nf/9H+uf/Q/OH/tJf+Gd/5f/2X/5f/93/4b/y3/w//I/+yf/x//WH/u/9f/xX/8a/95/+y//Sv/ub/+Lf/vv/q1//vf+b//Sn/tz/+f/vf/z/+f7b/z/+s//13/o7//P/+f/h//Vv/c//s//s//J3/vn/4r/yf/z5P0x//z/+l/+rv/b3/uF//D/42/+Df/0f+9f+p//Kv/OL/8If/u//of37/+Tv/+d/75/7J//Lv/N//V/+F//Vf/Xf+V//8//yH/2N/+3/9b/81b/33/2p//DP/J3//u//of39/91/53/wX/8X/+3/7L/6b/+9/+N/8Nf/q//Jf/Xvv/b3/0//8e/+i3/pb//j/+F/9z/9z/7m//Bv/o/+H/+5f/m/u/v5P/q//Of/M//u//5/+wf/r//g//kf/t//L/+n/8//0w/8z//P/9K//d/9S//Af/tX/uW/+nf/1n/5N/7n/+H/8Fd/5e/+H79Xf/eP48//p/+Fv/w//E/+4b/09/7B//u/8U//T/+z/+Af/Wf/2N/7J/9v/+Jh//4fzJ/7d/+r/87/43/89/9H/8e//0/89f/mf/Nf/c/+L/+vf+u//F/c/e//Z//Sf/lf/y//1t/+R/+Tf+u//of/zv/g//Vv/pX/z3/9zf/9P/v3/tE/8hf++V/7X/0//3t/+I/+pX/yf/Bf/hN/7Lf+v/7Ef/6/+B/+E//If/w//i//4T/8L/+Hv/3f/nv/q//xf/Lbf/g//xf/z//pP/a//gM/+j//L/7r/+1/8Pf+b//rv/Hf/zO//X/7T/7Rv/U//X/9f/wy//L/xT/yP/nP/uf/8f/8H/+f/+O/+Y//V//Af/FP/5//N//Zf/bv//P/6x/83/0P/8l/4v/yj/z3/sY/9vf/i3/0H/xr/+wf/e//U//8//n/+L/8O//Ef/n/9F/9D/+n/8j/5/f/9/8/Af/y//If/+v/5X/yf/q//vv/0t/9T/+Z/+qf/x/90//j/8F/9J///f/TP/I//E/+F//Xv/mv/rf/h//l//bf/xf/mf/uP/bb//d/5v/z+/+7/8m/+N/97/6e//w/+V/97/7df/c//L7/3t/9f/vV/+t/+rX/33/or/8o/+ff+yX/y9/5P/8V/8k/98/+F3/nD/fv/j//Mv/Yf/A//5b/yn/93/83/7v/87/5r/8T/+b/83++//F/+b/6Lf+m//Vf+k3/yf/7X/tv/w1/9x/67f/Z/+E/8y//gb//P/+g/+Pv/w//gn/jf/wP/1n/7D/wT/4f/7j/2T/8w//1//7//bf+Vv/w/+u/+tf/xf/Bf/df/mX/mf/mf/ef/xb/yA/n5/69/4u/+3//G//n/8J/+m//t/+Cf+Bf+o//zP/N3/i//tf/y//69//1/6N/5p/+Ff/rf+E//0T/yL/43/5f/n3/v//R//4P/+z+fv/B//k/+T//k7/2d/+Sf/ft/6+/8J/+jv//f/eP/1f/4n/wX/9P/1/Xf+7/7H/57/9h/+B/+X/7p/+f/5f/x//j9//1///f+P/9H/9O//If/8/+P/9d/7Xu/+//+T/4X/93/9v/5X/sP/5v/+3/z//r//n/9l3/53/zn/97/+R//5z+8P/c//+/+k//0f/p//E//7f/h//Jv/pd/8z/8v/w//97f/L3f//d+4Uf/57/zt/+pf/Ef+Gf+5//Lv/k//K//+X/zf/6f/z//N//TP/1//S/+j3/w//6H8+f/i//4v/oH/+Rf/bv/3t/73/x//qf/k3/k//gf/s//1f/5e/r7/+Rf+C//v/4f/9W//dd/85/9e3/pb/zX/9+/89/+0//Sb/3SP/2v/OYP5d//P/3f/57/5v/67/7n/+f/0//jv/x//pv/+D/8v/z33/+//z//J//Yf/0//N//p//J/+r/8gfz5//w/f3/2//if/I//A//9r/5n/yNv/7P/eO/8V/8V//A//z/+n/6rf/H/+n3/7d/+H/xH/1f//3/0//mv/g//u/+v/+f/8E//I//wX/wP/oLf+kH8vf/kP78P/nn/9V/8L/81/61/87/8v/yH/zX/+3/7X/7d/+Vf+l/9p/8/u//7/+Tf+C/+xf+m//qv/w//Jf/4v/kf/R//wM/+s//M//Av/Cf/r//yf/5//qH/vf/cP38P/J//I//7f/wf/X/+1//f/71/+Yf+5f+f/+r/9l/9Yf+9/+Z/vn/7n/+T/zu3/hb/8n/5z/+j/+Tf+z/9N//X/9P//v/4P/4r/2u//3/63/2j/+Df+g//Y//yf/v3/3D/vP/M//xv/C//tf+i//qv/q//E/+l/+z/9f/7X/xvf/df/s//y//Z7/9H/y3/1//2f/qD+3v/5//8//b//Tf+5v/xn/8//zf/X/+D//sf/E//vv/4//i//t3v/+P/tnf+e///D/z//w//yD/ff//A+3ff+/0f/X3z1+v/Yf/7P/8X/wB/P3/4G/+W//z/+r/+j/+H/8n/+bf/Z//V/+n/+L37vvd/+P/9B//y//Nv/+//K/+x/++/+K/+E//Ff/G//Q/+f7//P/0v/p//5b/7j/+P/5Nv/89//T/+//zu//z//i/+J/+H/+T/3//cf/+H/+f/b/+n/8ff+93/++/91v/p3/s7/63/n//Nf/k//Y//xO/+l1/7+//sf/R3/5//4f/xv/47/+3/9bf/R/+jf/h//I3/7m//bf/0//b7/+P/+q/8zT/wP/h//T/+u//jv/v/+i/+kH//v/73/69//V/55/6zv/X/+qdv/u//0D/3t/8P/+u/9Y/+w//7f/Kf/H7f+e/+J//s3/0f/8//Z//u//7f/q//pT/Y3/9v/+W/9k/90//d//i//a/+w//kf/n3/+f/yz/yP/ze//1/8u//w3/6v/tH/tH/7v/8r/4H/4//zT/4e3/ov/uH/vT/4p//g//1H/jf/+P/83/79/7R//xv/EP/4y/87L//z/56+ef+K//X/+4/+Rd/+2/+B//z//p/9k/+n/83P/f//r3/3f/m3/67/8//+f/57/6f/pf/i//Tn/sBcP7j+vf/nv/hf/mv/3f/t3/m//Ff/jd/6x/6E//U/+Jv/af/X/+v/+M/8m//u7/xT/8//9z/7T/3B/73f+e/+h/9W/+j/+bf+E//R//hv/Mf//f/j3/x//m//L/8k//Un/zh/P3/9//z//zf/Sf/9N/5v/w//nf/0n/17/0v/s7/7Xu/+w/+z/4H/51/+nf+j/+rv/+P/6f/zH/zv/1z/+zPfv8f+J///r/xf/x//bf//f/q7/7v/w//8v/mn/1//M/+h7/7u//cf/Zv/J/+k3/y//R//p/8n//v/8x/83f+W//cf/oP/vS//3/7X/3P/8f/+Y/+5x/tn/+3/t//zf/5//k/+F/9G//T/+5/+Z/93/73/73/9//zf//3/n//uw/z9/9P/91/+V/+v//r/+f/+Hf+z/+lf+3v/Kt/5z/7/f/7f/2r/+n//B/+w//p//r//Jt/4u//L/+xP/7P/99+7X/9z/2l//l/8Lf+T//o//Qf/Z//a//iv/03/uNf+p3//If+93/vf/4//V/+0//23/yn/uX/0//4v/te//5P/+K/86/8u//If/h3/s7/+x/+s/+X//V/+nv/s3/5f/A//+P/41//H/7e//f/7b/zj/2v/69/4E//uT/xL/5L/+P/7Df+xf/qv/nj//P/+l/7j/7x/91v/vP/xB/53/8j/9rf+6f+xz/zf/8//G//5Pf+8f/5X/zD//t/8g/9/k/+V//Qv/v//u/+jf/07/5v/8Y//E/+tf/p//h//T3/3//+P/Pf/N2/+d/7p/+v/+D/+Lv/7f/u//M/+x/+F/+f/43f/+/+i3//H/gf/bf/g//u//1//Ht/+H/+z/83/+V/8k/+b/4v/5d/4X/zh/f3//v/yr/43/93/r1/5O/8zX/s7/3Nf/h//m/+tf/p//Wf/uv/wT//f/m//R/+q//+//afe+3f+yf+xX/h//B/+R/+k//4//hv/b3/9P/0T/yf/t9+85/8v/03/oH//Q/vz/+n/7v/7N/8X/7N/+W/+4//d//93/zP/2//xt/7f/1rf+S/+2/8w//lP/mD/ft/aH/hP/2f/e1/82/+/f/kf/m//cf/+N/5z//h//V/+g/+i3/kf/df+a0//0//lz/0v/9H9ef/l3/p7//f/u5/99/8W//13/7P/rP/+L/8O3/vH/yf/mf/4A/87//h+/kv/vN//j/+G//l//3/9F/8Z/+9v/YP/Z3/4nf+F3/pf/lP/ZGf/X3/+3/u//F//T//l//V//rf+k//h//kf/X//N/8rf/F9///+M/8X/+f//P/5T/y7/2D/+k/+kf/5p/4l/7oT/5z/8P/+3/1P/mD//N/eH/u3/t//5//r//yv/ov/u7/6p/6z/6lv/nf/X//Qf7+P/u3/7t/7O/8vX/2v/8f/v3/83/3//V//K/+g//J3/2f/sN/7U//3k/9/v/+//Nf/h//tf/0f/Zf/uf/7T/y3/9H/l//8b/0z/97v/cH/++/+7/7W//ff+vv/D//m//kf/77n/8P/9n/3j/9//03/8V/+j/8t/+xP/NP/if/p//Nf/V/+Sf/2D/7B/r5P/gn/+W/+0/+s//43/qH/+7f+d/8J//zv/X3/uHf/l/95z+MP/+v/Y9+87/+b/69f+Vv/6N/9x/55/6p/+bf+5/+H//u7/3O9//3//G/+1/8g7/xf/g7/4u/+Td++R/4j//aX/of/Wv/zO/8D/7gf/8P7c//z/67/+rf++/+nf/p3/yv/jf/6n/1v/xv//v/+Af+8//Rf/E3/63/6z/6u3/of/j//r3/5R/o7//Cv/O3/oN/8u/80//0P/xH/+f/l//nf/b7/+w/9b/+H/72P/T//D/8x//d//jv/L3/+B/70T/7b/7x//o/+hf+/i/85A/vz//n/9o/9k/+3X/+H/hn/p/X//0/8p/9J/+H/8g/9l/8X/+O//Vf+pM/+Wv/3F/5Y//E3/mf/d//2f/qz/+zf+aP/sxf+X//s7/yx/7If/bf+Y//7M/85D/7P/v//K3/8T/1p3/hV/7Sn/5X/vj//Y//6N/+J/7oj//X/w//5P/15/7Ef+G/8AP/+z//O//Ov/P//Bt/+3/4v/jv/5/+V//2//1/8d/8Z/+gL/6lf/E//E//+//i3/nf/m/+h/+3f+x/+Pv/5t/5V/7Ov/u//h/+u//BP/nP/Lv/37/1z//O//cP+u//8/+v/99/9X/6l/6Hv/Z//t/+rf/3//d/+V//B//J7/z+//1/8E/9i//6//y/+Jt/77/8+//gf/j//q3/5c/8hf/8V/7Xv/mL//Rv/H/+oR/v3/+f/v3/5O/9zf/pv/3f/s//h//1//S//dd/7f/1O//Pv/3/+D/+j//h//v//Hf/6H/zP//7/5f/5f/y//U//9///B/+3/9P/5+/9/f+iR/+3/9L/6P/+u/8T/+pf/C//q/+q//Zf/pf/nf/i3/rd//R/+Hv/u5/+2/+D/9v/+K//a/+7v/uf/T//v/59/6Z/+if/d//jT/4vf/8n/j//J//N3/nb/0rf/Hv/pH/1v/1t//oX/rV//af+Ke+/7//T//c//pv/A//r//G//Bf/lv/wv/0f/hf/aM/+RP/2u//+f+/P/9v/M//v/87/+Rf/bd+7+/9v/+X/9Hf+h/+g3/+v/z//YH//X/83/rH/su/8J/+l//Yf/n/+r3/6Xf/9//g//Y//Nv/zd/6h//Zv/1f/L/+yO//8//df/Rv/n/+mb/0h/v3/4n/8z/xv/jv/uf/wf/uv/k//c//J7/7P/n//qN/4/f/9v/p3/hH/st/9e//r/5ff/B//3/+T/6Ff/k//bf+hR/un//n/v7/4P/yf/of/s//+b/9n/yP/pf/8Xf/9//u//K//Sf+u//OP/x3/w//p//pb/+Tv/n/+n/8P/9P/tH/4zd++c/+wf77/+if+h/+3f/kH/2f//X/x//6v/jv/l//1X/x//j//r3/w7/4v/lv/uYf+L//P/4v/xf/3T/y3/wL//Qf+u//P//Tv/xHfuEn/+Xf/Jf+aP/+f/o//x/+4f/iv/j1/+1/93/4r//W//mf+w/+4T/8B/7Iv/nf/K3/9u/8hR/7n/3x//Yf/u3/6n/yP/k//2//vd/+/f/7/8///f/ye//U//kP5+//4/+X/+Tf+Hv/yt/8f/1//Xf/6H//f/3//x/+P//Iv/2v/vov/H/8gX/+n/j+//3/9f/xe//Y3/tv/6//u//0n/md/+Xf++//pX/hP/j//Jf/uf/xP/bb/w//t+/97//c//j/9e//U//Qf/2P/H7/+f/nf/df/g//n/9S3/rd/6vf+93/vV//tf++3/3//6H/v//ef+d//wf/+z//Y//Q/+Pv/g//8r/xz/+Yf6J/9x/79/8v/4n/19/7xv/bf/2v/k7/53/6f/h+//3/+G/+z/+P/w3/9f/9f/0//c//P7/+9/9X/8H/+Qf+u//w//4f/P7//O//f/+z/8H//e/+2/9r/4df/O3/9i/98h/8z/+xf/Q//ad+61/+Y//8//O//X/8I//E7/6h//0/+Nv/o7/5L/97/+I/+U/+6v/t3/tL/4cf/e//7L/yd/7bf+zv/l/+0T/xP/k//Cf/zP/x+//7f/7v//3/+7/5//rd/+G//J+89t/94/v3/u5/+u//nb/3L/4v/9P/+G/9nX/97/+X/6f/+x/83//R//1/+B/+3h/43/+n/8f/+d/9r/+7/8V/+q/+D//c//37//O/93/9H/zf/sE/89/+K//N//y//k/+x3/nb/x//5F/9w/u7//hP/d//rv/l//qH/t//Pv/6P/5//P/+j/8Y//Vf/hf/Gf/3e/94f/8//3/+O/99v/o3/u//S/+e//Y//YP9O//v/4z/87/7e/8j/7W//V/+Q//q//yv/l7/8p/8ff+1O/84f/9/+f/9x/+l3/7f/n/+g/+oz/0v/uj/fv/7f/B//k/+O/+5d/+3/33/+F//a/+l/+jv/Nf/Ft/77d/7s//+B/5n/9z/+A/9j/5H/+f/+P/w//x//Zv/Z//p//r//Gf+5/+z37n+///L+jP/+q/+pf+h//gH/wX/+rf/vv/z3/xH/uf/Zf/3v/x//OD/ft/5n/8L/6P/+v/z//wX/on/qv/t//5//k/+g/+q//iv/zf/j//T3/nv/y2//7v/M6/+X/+z/7R/+V/9l/8/f/93/xH/9d/97/8v/+Tf/h/+Ht/7w/n7//u//Zf/p//f/6D/+J//t/8D/7Rf+m//J/83f/i3//f/vf/1v/r9/73/+w/8Tv/k//u//EP/e//u3/gf/z9f//f+e/8L//e//Q/+/f+1f/xX/wX/sy/+M/+4P/+H/6f/1//p7/+f/m//k/+w3/yP/4//4//x7/3v/+//oP/u7/7v//t//L/9g/8c//Gv/Ef/cN/5I/+8z/+3/1j/+v/83/zv/1f/A/+t//R//I/+f/+/f/d//f/1//x//Xv/n/+3h/K3/9H/t3/9z/wP/h//nv/7N/+3/0//pP/4+/+N//K//Dv/q//8v/6H/0//8//u7/8v/yjP/pv/sEf/e//0//u//P/9X/7B/+p//H//vf+Z//T/+z//L//3//3/51/9b/5H/9L/83/+A/87/9v/8+/+7/7e//En/jv/pH/3h/43/+P/p3/+m/+V/+b/+bf/+/+qT/7f/mj//M/8V/+5X/x//1f/Qf/5K//M3/ov/6Nf+r/8B/+47/+f/oX/4V/4p/7+d/7o//zf/Z/8t/+7/6v/8pf+2//P/67/+Ff/mf+J//Lv/EP//Sf+T//L/+rv/4//P//3q/9c//j//F//Gf/r//mP/pv/rH/z7/yn/yb/+1//X/7Z/7un/ih//1/+n/9F/6H/+v/8//+f/g//D/+vv/7/90/92/9J//u//P/+Hv/1T/0P/u9/+3/4B/7i//un/qD/ff+p//m//S//X/+k//wf/h//v1/8t/8B//Z/+b//N//rf/Br//u//Uf/fv/4H/+P/m+/9y/90//0r//p//of+e//1f/6v/1//d7/+z/6X//rf/Zf/IP/+x/4n/+z/+f/4b/3u//n/+H/8N/8rf/g//g//ct/5N/4w//3//Sf/r/9t//B//i//z/9Y//dD/fv/8//b3/9f/Jv/4//k7/7n/wD/8f/09//X/yf/+Hf+ef+i//h//n/+P/6P/1P//t/8Pf+9//iv/S//P/+f/73/6e/82/+F//dP/Ln/rk/9Af/9//c//D/8/f+2b/2d/7+v/s/+b//d//Kv/sv/MN/8rf+d//Ff/P//ef+g//lf/rf/K//zv/uP/u//E/+g//27/wD/8z/5b/+f/xz/+2/9bv//A/i7//B+/v/m//gf/A//S//wf/+f/g//m//g//Zv/r//f7//q/9d//P/+P/7Hf/8T/wv/u///v/H7/1f/2Nv/rf/w//y7/xe//Yf/UP/j//x//N/+yf/N//u/+2//8n/0z/wz/+Ov/d//Z/+5u/+N//y//Y//Hf+L//cv/qv/If/7X/zP/p//Tb//L/2L/7P/63/+G/+l/+n/+G/+H/+h/9v/73/+H/xf/x///6P/9//wX/v//of/u3/5X/2t/87//J//d/93f/Db/0v/nf/+b/+T/x//+//h7/wd3/t//H/uP7zX//f/Z//Z//5f/h7/+L/6X/7v/3X/tH/5X/5X/2f/47f+a//m//wH/yD/9P/+r//f/4//B//8//Z//Tv/q//1z/88//K7/+pf+r/+Lv/q//t//n3/v1/8F/5R/6vf/C//6//a//if/v//J//Z3/rf/b/+df+sf/b//h//xf/B//F/+T/9+/80//Sf+P/+F/9M//If/t//0/+5j/2D/3u//Z/9pf//B/d3//X/oX/5t/9T/7v/9bf+7v/9D/yd/+zv/P/+O/+6n/73/3n/7f/x3/2H/xv/8bf/qX/4f/9f/uf/Bf/i7/3f/67/+P/+lf+//v66z/4P/9//nf/+H//r/13/+rf+r/8P/7f/9t/8Pf+m//h//z/9f/6tf/9v/n3/p3/+F/7v/8//7//zf/g7/+pf+x/9P/81f+G/+C//xf/hb/+D/9H//dd/+w/37//B//t/9n/+b//Bf/o//g//h//k7/1n/9h//n/4x/+r/+b/9W/8V//xf/c//u/+T//cX/lB/Pn/4Vf/1b/3X/yP/ot/+7/73/1X/+S//h/+o//w//H//t/9lz//i//K//Xf+k/+b//u//v/8v/97/wz/8Nv//3/03/wT/3u/+L//X/+P/7W//N/+ff+b//Ff/Yv/Yv/g7/wZ3/jz//N//of/u9/+3/29/7eX/rj//f/+h/7v/4H/8xP/tJf/F/+q//i//S//Xf+6d/9V/74//R/+Xt/+B/40T//l/+Fv/zP/41/5r/+3/83/97/9L/+7/+df/b/8J/+T/93f/6f/aX/+h//P/5v/+ff+j/8P//Xf+Vv/E/+wd/4s//gX/hH/sd/8U/91z/+P/wf/sX/0//m//I//u///M/9pV/9F/+l/+FH5+//T/+lv/8//Hv/9f/yf/zf/1//T//j/+yf/s//u//h3/5f//d/98/9v//f/47f+b/8x/+X//t//Z/+zf/8f/j//F/+p//8v/y//UP/+x/93/99//l/8Td/52/+g//lP/RH/+f/3j/5f/hv/oU/+b/+V/+zf+r/+ru//w//7v/n3/17v/0v/rk/97/7f//f/yP/6v/k7/7z/9Hf+Qv/6v/xn/v9/8P/+x/7vv/+/+fP/0v/yH/73/4v/83/+m/+t//Gf/v/+H/8v/4H/+w/8Hv/vT/6P/lv/l//m//k//pb//rv/lP/0u/8xf/lP/z3/8W/+s//v/9Pf+xv/5N/57/+B/74X/3D//M/8E/8z/6v/9x/+nv/u7/wf/lvf+UP/u//if/Lv/rf/yv//f/t//wv/pP/0//pH/23/k//jT/7L/5zf+I3/ld/8C//e//cv/Cf/Jf/l7/x9/7Zv/3v/l//F//F//l/+bv/3D/0P/8f/47/99/5P/wX/9l/+Z/+b/+rv/Qv/E//Z3/r//H/+eU/+r/4/f+9f+E/+P3/+/fz53/u//p/+1v/1X/8v/q//If/xd/5x/7e3//v/p//63/xv/t7/9t/+z/9u3/3D+3P/3v/+v/w7/+P/+v/3X/zT/8P/x//yf/oH/+Hf+8//B//7V/7A//7f/p/8dv/u7/9v/9v/8f/v//gv/o3/k//4//h//ef/K//1t/5j//+f/c3/rf/7t/7z/6Tv/v/+kf/k//e//P/9f/87/6j/+P/82/8E//k//h/+lf+p//qf/H//Xf/8X/1T/2f/uDr//v/L//33/rf//O/99/9A//q//D/+C//yX/5v/u7/+X/9b/9F/4v/8z/8b/95/7u/+d/+nf+G//If/53/49/51/+B/6n/+f/4e/+3X/mr/0//m//U7/5T/3X/8W//Pd/5w/87/+h//kf+p//s7/33/79/8u/98/+U//T//If+93/7u/8g//u//M//W//9f/uX/u//qf/Y//V//gf/vU/93f+qz/4v/+P/s//k7/xj/7N//E//Sv/g//sv/0//B/+s//y3/h7f/tv/s3f/uE/+tv/rf/if/I///v/+X/0L//P/n//yz/8P/xjf+3/+F/++//SP/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"
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<AlertCircle className="w-6 h-6" />}
            label="Open Conflicts"
            value={openConflicts.length}
            color="orange"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Resolved"
            value={resolvedConflicts.length}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Avg. Resolution Time"
            value={`${avgTimeToResolution.toFixed(1)}h`}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Conflicts"
            value={userConflicts.length}
            color="purple"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
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

          {(user.role === 'mentee' || user.role === 'mentor' || user.role === 'omniscient' || user.role === 'fly-on-wall') && (
            <button
              onClick={onCreateConflict}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              New Conflict
            </button>
          )}
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
    <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-light text-stone-800 mb-1">{value}</div>
      <div className="text-sm text-stone-500 font-light">{label}</div>
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
      className="bg-white rounded-xl p-6 border border-stone-200 hover:border-amber-300 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-stone-800 group-hover:text-amber-600 transition-colors mb-2">
            {conflict.title}
          </h3>
          <p className="text-stone-600 text-sm line-clamp-2">{conflict.problemStatement.what}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[conflict.status] || 'bg-stone-100 text-stone-700'}`}>
          {conflict.status.replace('-', ' ')}
        </span>
        <div className="flex items-center gap-1 text-stone-500 text-sm">
          <Users className="w-4 h-4" />
          <span>{conflict.mentees?.length || 0} mentees</span>
        </div>
        <div className="flex items-center gap-1 text-stone-500 text-sm">
          <Clock className="w-4 h-4" />
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
          email,
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
        console.log('Conflict successfully saved, calling onCreated');
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
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-200">
          <h2 className="text-3xl font-light text-stone-800 mb-8">Create New Conflict</h2>

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
                    Window (min)
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
                <textarea
                  value={formData.what}
                  onChange={(e) => setFormData({ ...formData, what: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.what ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="What is the issue?"
                  rows={3}
                />
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
                <textarea
                  value={formData.how}
                  onChange={(e) => setFormData({ ...formData, how: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.how ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="How did this conflict arise?"
                  rows={3}
                />
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
                <textarea
                  value={formData.desiredOutcome}
                  onChange={(e) => setFormData({ ...formData, desiredOutcome: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.desiredOutcome ? 'border-red-500' : 'border-stone-300'
                  }`}
                  placeholder="What would an ideal resolution look like?"
                  rows={4}
                />
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
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-3xl font-light text-stone-800 mb-2">Review Proposed Changes</h2>
            <p className="text-stone-600">
              {proposedChanges?.proposedByName} has proposed different terms
            </p>
          </div>

          {/* Conflict Info */}
          <div className="mb-8 p-6 bg-stone-50 rounded-xl">
            <h3 className="font-medium text-stone-800 mb-2">Conflict: {conflict.title}</h3>
            <p className="text-stone-600">{conflict.problemStatement.what}</p>
          </div>

          {/* Comparison */}
          <div className="mb-8">
            <h3 className="font-medium text-stone-800 mb-4">Proposed Changes</h3>
            
            <div className="space-y-4">
              {/* Response Hours */}
              <div className="grid grid-cols-2 gap-4">
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
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-3xl font-light text-stone-800 mb-2">Terms Acceptance</h2>
            <p className="text-stone-600">Please review and accept the conflict resolution terms</p>
          </div>

          {/* Conflict Info */}
          <div className="mb-8 p-6 bg-stone-50 rounded-xl">
            <h3 className="font-medium text-stone-800 mb-4">Conflict: {conflict.title}</h3>
            <p className="text-stone-600 mb-4">{conflict.problemStatement.what}</p>
            <div className="text-sm text-stone-500">
              Created by: {conflict.mentees?.find(m => m.id === conflict.createdBy)?.name || 'Conflict creator'}
            </div>
          </div>

          {/* Current Terms */}
          <div className="mb-8">
            <h3 className="font-medium text-stone-800 mb-4">Proposed Response Settings</h3>
            <div className="grid grid-cols-3 gap-4">
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white">
            <h1 className="text-3xl font-light mb-2">{conflict.title}</h1>
            <p className="text-amber-100 mb-4">{conflict.problemStatement.what}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                {conflict.status.replace('-', ' ')}
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
                  className={`px-6 py-3 rounded-lg font-medium transition-colors capitalize ${
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
          <div className="p-8">
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
      setNewParticipantEmail('');
      setShowAddParticipant(false);
      await onUpdate();
      alert('Participant added successfully!');
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
        <div className={`p-6 rounded-xl border-2 ${
          nextAction.color === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
          nextAction.color === 'orange' ? 'bg-orange-50 border-orange-300' :
          nextAction.color === 'blue' ? 'bg-blue-50 border-blue-300' :
          nextAction.color === 'purple' ? 'bg-purple-50 border-purple-300' :
          nextAction.color === 'amber' ? 'bg-amber-50 border-amber-300' :
          nextAction.color === 'green' ? 'bg-green-50 border-green-300' :
          'bg-stone-50 border-stone-300'
        }`}>
          <div className="flex items-start justify-between gap-4">
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
                className={`px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap ${
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
        <h3 className="text-xl font-medium text-stone-800 mb-4">Problem Statement</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoCard label="Who" value={conflict.problemStatement.who} />
          <InfoCard label="What" value={conflict.problemStatement.what} />
          <InfoCard label="Where" value={conflict.problemStatement.where} />
          <InfoCard label="When" value={conflict.problemStatement.when} />
          <InfoCard label="How" value={conflict.problemStatement.how} colSpan={2} />
        </div>
      </div>

      {/* Outcomes */}
      <div>
        <h3 className="text-xl font-medium text-stone-800 mb-4">Outcomes</h3>
        <div className="grid grid-cols-2 gap-4">
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-stone-800">Participants</h3>
          <button
            onClick={() => setShowAddParticipant(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Participant
          </button>
        </div>
        {/* Debug info */}
        <div className="text-xs text-stone-500 mb-2">
          Total mentees: {conflict.mentees?.length || 0}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {conflict.mentees?.map((mentee, idx) => {
            console.log('Mentee', idx, mentee);
            return (
              <div key={idx} className="flex items-center gap-3 p-4 bg-stone-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium flex-shrink-0">
                  {(mentee.email || mentee.name || 'M')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 truncate">
                    {mentee.email || mentee.name || 'Mentee'}
                  </div>
                  <div className="text-xs text-stone-500 capitalize">Mentee</div>
                </div>
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
    <div className={`p-4 bg-stone-50 rounded-lg ${colSpan === 2 ? 'col-span-2' : ''}`}>
      <div className="text-sm font-medium text-stone-500 mb-1">{label}</div>
      <div className={`text-stone-800 ${className}`}>{value}</div>
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
      <div className="bg-stone-50 rounded-xl p-6">
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
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium">
            {(mentee.name || mentee.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-stone-800">
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
            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Acknowledge
          </button>
        )}
        
        {!isCurrentUser && userHasAcknowledged && (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Acknowledged
          </div>
        )}
      </div>

      <p className="text-stone-700 mb-3">{response.paraphrase}</p>

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
            <span className="font-medium text-stone-800">What:</span> {conflict.problemStatement.what}
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
            <textarea
              value={paraphrase}
              onChange={(e) => setParaphrase(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
              placeholder="Paraphrase the problem statement..."
              rows={4}
              maxLength={250}
            />
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
          <div key={idx} className="bg-white rounded-lg p-4 border border-stone-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium flex-shrink-0">
                {cycle.userName[0]}
              </div>
              <div className="flex-1">
                <div className="font-medium text-stone-800 mb-1">{cycle.userName}</div>
                <p className="text-stone-700">{cycle.statement}</p>
                <p className="text-xs text-stone-500 mt-2">
                  {new Date(cycle.timestamp).toLocaleString()}
                </p>
                {cycle.lateSubmission && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1 text-xs text-red-700 font-medium mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Late Submission ({cycle.minutesLate} min late)
                    </div>
                    <p className="text-xs text-red-600 italic">"{cycle.lateReason}"</p>
                  </div>
                )}
              </div>
            </div>

            {cycle.paraphrase && (
              <div className="ml-11 pl-4 border-l-2 border-green-200 mt-3">
                <p className="text-sm text-stone-600 mb-1">Paraphrased:</p>
                <p className="text-stone-700">{cycle.paraphrase}</p>
                {cycle.lateResponse && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1 text-xs text-red-700 font-medium mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Late Response ({cycle.minutesLate} min late)
                    </div>
                    <p className="text-xs text-red-600 italic">"{cycle.lateResponseReason}"</p>
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

                <textarea
                  value={paraphrase}
                  onChange={(e) => setParaphrase(e.target.value)}
                  disabled={!canParaphraseNow()}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2 disabled:bg-stone-100 disabled:cursor-not-allowed"
                  placeholder={canParaphraseNow() ? "Paraphrase their statement to show understanding..." : "Wait for cooling period to end..."}
                  rows={3}
                  maxLength={250}
                />
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

          <textarea
            value={becauseStatement}
            onChange={(e) => setBecauseStatement(e.target.value)}
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
            placeholder='Example: Because I feel frustrated when plans change without notice, I need more communication about schedule updates.'
            rows={3}
            maxLength={250}
          />

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
          <div key={alt.id} className="bg-white rounded-lg p-4 border border-stone-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-stone-700 mb-2">{alt.text}</p>
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                  <span>By {alt.createdByEmail || alt.createdByName}</span>
                  <span>{new Date(alt.timestamp).toLocaleString()}</span>
                </div>
                {alt.lateSubmission && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1 text-xs text-red-700 font-medium mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Late Submission ({alt.minutesLate} min late)
                    </div>
                    <p className="text-xs text-red-600 italic">"{alt.lateReason}"</p>
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

          <textarea
            value={alternative}
            onChange={(e) => setAlternative(e.target.value)}
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
            placeholder="Describe a potential solution..."
            rows={3}
            maxLength={500}
          />

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