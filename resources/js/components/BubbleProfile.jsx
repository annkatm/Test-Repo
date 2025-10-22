import React, { useState, useRef, useEffect } from 'react';
import { Edit, Home, LogOut, ChevronRight } from 'lucide-react';
import ProfileDetailsModal from './ProfileDetailsModal';

const BubbleProfile = ({ 
    name, 
    image, 
    size = 40, 
    backgroundColor = '#4A90E2',
    user = {},
    onEditProfile,
    onLogout 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [displayImage, setDisplayImage] = useState(image || user?.avatar_url || user?.image || user?.profile_photo_url || null);
    const [showProfileDetails, setShowProfileDetails] = useState(false);
    const dropdownRef = useRef(null);

    // Update display image when props/user change; ignore blob: URLs
    useEffect(() => {
        const next = image || user?.avatar_url || user?.image || user?.profile_photo_url || null;
        setDisplayImage(next && String(next).startsWith('blob:') ? null : next);
    }, [image, user]);

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return '';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleProfileDetails = () => {
        setIsOpen(false);
        setShowProfileDetails(true);
    };

    const handleEditProfile = () => {
        setIsOpen(false);
        // Open the same profile details modal for editing
        setShowProfileDetails(true);
        if (onEditProfile) {
            onEditProfile();
        }
    };

    const handleLogout = () => {
        setIsOpen(false);
        if (onLogout) {
            onLogout();
        }
    };

    const styles = {
        bubble: {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            backgroundColor: !image ? backgroundColor : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: `${size * 0.4}px`,
            fontWeight: 'bold',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
        },
        image: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Profile Bubble */}
            <div 
                style={styles.bubble}
                onClick={toggleDropdown}
                className="hover:scale-105 active:scale-95"
            >
                {displayImage ? (
                    <img src={displayImage} alt={name} style={styles.image} onError={() => setDisplayImage(null)} />
                ) : (
                    getInitials(name)
                )}
            </div>

            {/* Profile Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-in slide-in-from-top-2 duration-200">
                    {/* Arrow pointing to profile bubble */}
                    <div className="absolute -top-2 right-6 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
                    
                    {/* Profile Header */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold">
                                {displayImage ? (
                                    <img src={displayImage} alt={name} className="w-full h-full object-cover rounded-xl" onError={() => setDisplayImage(null)} />
                                ) : (
                                    getInitials(name)
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">{name || 'User'}</h3>
                                <p className="text-sm text-gray-500">{user.role || 'Admin'}</p>
                                <button 
                                    onClick={handleProfileDetails}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 flex items-center"
                                >
                                    Personal Details <ChevronRight className="w-4 h-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Items */}
                    <div className="p-2">
                        {/* First Group */}
                        <div className="space-y-1">
                            <button 
                                onClick={handleEditProfile}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                <Edit className="w-5 h-5 text-gray-600" />
                                <span className="text-gray-700">Edit Profile</span>
                            </button>
                            
                            
                            <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors">
                                <Home className="w-5 h-5 text-gray-600" />
                                <span className="text-gray-700">Add to Home Screen</span>
                            </button>
                        </div>


                        {/* Logout Button */}
                        <div className="border-t border-gray-100 my-2"></div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Log out</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Details Modal */}
            <ProfileDetailsModal
                isOpen={showProfileDetails}
                onClose={() => setShowProfileDetails(false)}
                user={user}
            />
        </div>
    );
};

export default BubbleProfile;