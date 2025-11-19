import React from 'react';
import { X } from 'lucide-react';

const EquipmentDetailsSlidePanel = ({ isOpen, onClose, equipment }) => {
  if (!isOpen) return null;

  // Get icon URL based on category name
  const getItemIconUrl = (categoryName) => {
    if (!categoryName) return 'https://api.iconify.design/mdi:package-variant.svg';
    
    const category = categoryName.toLowerCase().trim();
    
    const iconMap = {
      'laptop': 'https://api.iconify.design/mdi:laptop.svg',
      'computer': 'https://api.iconify.design/mdi:laptop.svg',
      'mouse': 'https://api.iconify.design/mdi:mouse.svg',
      'keyboard': 'https://api.iconify.design/mdi:keyboard.svg',
      'monitor': 'https://api.iconify.design/mdi:monitor.svg',
      'display': 'https://api.iconify.design/mdi:monitor.svg',
      'headphone': 'https://api.iconify.design/mdi:headphones.svg',
      'headphones': 'https://api.iconify.design/mdi:headphones.svg',
      'webcam': 'https://api.iconify.design/mdi:webcam.svg',
      'camera': 'https://api.iconify.design/mdi:camera.svg',
      'printer': 'https://api.iconify.design/mdi:printer.svg',
      'scanner': 'https://api.iconify.design/mdi:scanner.svg',
      'tablet': 'https://api.iconify.design/mdi:tablet.svg',
      'phone': 'https://api.iconify.design/mdi:phone.svg',
      'mobile': 'https://api.iconify.design/mdi:cellphone.svg',
      'router': 'https://api.iconify.design/mdi:router-wireless.svg',
      'switch': 'https://api.iconify.design/mdi:network-switch.svg',
      'server': 'https://api.iconify.design/mdi:server.svg',
      'desktop': 'https://api.iconify.design/mdi:desktop-classic.svg',
      'projector': 'https://api.iconify.design/mdi:projector.svg',
      'speaker': 'https://api.iconify.design/mdi:speaker.svg',
      'microphone': 'https://api.iconify.design/mdi:microphone.svg',
    };
    
    if (iconMap[category]) return iconMap[category];
    
    for (const [key, url] of Object.entries(iconMap)) {
      if (category.includes(key) || key.includes(category)) {
        return url;
      }
    }
    
    return 'https://api.iconify.design/mdi:package-variant.svg';
  };

  const items = equipment?.items || [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide Up Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-50 rounded-t-3xl max-h-[80vh] overflow-hidden">
        <style jsx>{`
          @keyframes slideUpFromBottom {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          .slide-panel {
            animation: slideUpFromBottom 0.3s ease-out;
          }
        `}</style>
        
        <div className="slide-panel h-full flex flex-col">
          {/* Header with drag indicator */}
          <div className="bg-white px-6 pt-4 pb-3 border-b border-gray-200">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {items[0]?.equipment_name || items[0]?.name || 'Equipment Details'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-6 overflow-y-auto">
            {items.length > 0 ? (
              items.map((item, index) => {
                const iconUrl = getItemIconUrl(item.category_name || item.category);
                
                return (
                  <div key={index} className="space-y-4">
                    {/* Equipment Icon and Name */}
                    <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img 
                          src={iconUrl} 
                          alt={item.category_name || item.category}
                          className="h-10 w-10"
                          onError={(e) => {
                            e.target.src = 'https://api.iconify.design/mdi:package-variant.svg';
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.equipment_name || item.name}
                        </h3>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Brand</label>
                        <p className="text-base text-gray-900">{item.brand || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Specifications</label>
                        <p className="text-base text-gray-900">
                          {item.specifications || item.specs || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No equipment details available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EquipmentDetailsSlidePanel;
