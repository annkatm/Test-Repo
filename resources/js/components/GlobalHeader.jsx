import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import BubbleProfile from './BubbleProfile';

const GlobalHeader = ({ title = "", onSearch, hideSearch = false, showTitle = true }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Add a small delay to ensure session is established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // First try to get login data (in case we just logged in)
        let response;
        try {
          response = await fetch('/login-data', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            credentials: 'same-origin',
          });
          
          if (response.ok) {
            const loginData = await response.json();
            if (loginData.success) {
              setUser(loginData.user);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.log('Login-data endpoint failed, trying profile endpoint:', error);
        }
        
        // If login-data failed, try the profile endpoint
        response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          credentials: 'same-origin',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.data);
            try { localStorage.setItem('user', JSON.stringify(data.data)); } catch (e) {}
          } else {
            // Try to get user from localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
              } catch (e) {
                console.error('Failed to parse stored user data:', e);
                setUser({
                  name: "Not Authenticated",
                  role: "Please login",
                  email: "No user data available",
                });
              }
            } else {
              setUser({
                name: "Not Authenticated",
                role: "Please login",
                email: "No user data available",
              });
            }
          }
        } else {
          // Try to get user from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (e) {
              console.error('Failed to parse stored user data:', e);
              setUser({
                name: "Not Authenticated",
                role: "Please login",
                email: "No user data available",
              });
            }
          } else {
            setUser({
              name: "Not Authenticated",
              role: "Please login",
              email: "No user data available",
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Try to get user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch (e) {
            console.error('Failed to parse stored user data:', e);
            setUser({
              name: "Not Authenticated",
              role: "Please login",
              email: "No user data available",
            });
          }
        } else {
          setUser({
            name: "Not Authenticated",
            role: "Please login",
            email: "No user data available",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleEditProfile = () => {
    console.log('Edit profile clicked');
    // The profile modal will be opened by the BubbleProfile component
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (response.ok) {
        // Clear any stored user data
        localStorage.removeItem('user');
        // Redirect to login page
        window.location.href = '/';
      } else {
        console.error('Logout failed');
        // Still redirect to login page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login page
      window.location.href = '/';
    }
  };

  // Show loading state while fetching user data
  if (loading) {
    return (
      <header className="flex items-center justify-between px-10 py-6 bg-white">
        {!hideSearch && (
        <div className="flex-1" style={{ maxWidth: "644px" }}>
          <div className="relative">
            <input
              id="global_search"
              name="global_search"
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-5 text-gray-400" />
          </div>
        </div>
        )}
        <div className="flex items-center space-x-6">
          {showTitle && <span className="text-gray-700 font-medium hidden sm:block">{user?.name || "User"}</span>}
          <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-10 py-6 bg-white">
      {!hideSearch && (
        <div className="flex-1" style={{ maxWidth: "644px" }}>
          <div className="relative">
            <input
              id="global_search"
              name="global_search"
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => onSearch && onSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-5 text-gray-400" />
          </div>
        </div>
      )}

      <div className="flex items-center space-x-6">
        {showTitle && <span className="text-gray-700 font-medium hidden sm:block">{user?.name || "User"}</span>}
        <BubbleProfile 
          name={user?.name || "User"}
          image={user?.image}
          size={36}
          user={user}
          onEditProfile={handleEditProfile}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
};

export default GlobalHeader;
