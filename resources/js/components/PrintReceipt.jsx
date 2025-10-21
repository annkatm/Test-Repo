import React, { useState } from 'react';
import { Printer, X, Package, User, Briefcase, Calendar, Hash, Edit2, Save } from 'lucide-react';

const PrintReceipt = ({ 
  isOpen, 
  onClose, 
  transactionData,
  onPrint
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState({
    full_name: '',
    position: '',
    department: 'IT Department',
    equipment_name: '',
    serial_number: '',
    notes: '',
    it_admin: 'Arvin D. Salas',
    hr_lead: 'MAUMondres/PMagdadaro',
    it_admin_title: 'IT Administrator',
    hr_lead_title: 'Senior IT Consultant/HR Lead'
  });

  // Initialize editable data when transactionData changes
  React.useEffect(() => {
    if (transactionData) {
      setEditableData(prev => ({
        ...prev,
        full_name: transactionData.full_name || '',
        position: transactionData.position || '',
        department: transactionData.department || 'IT Department',
        equipment_name: transactionData.equipment_name || '',
        serial_number: transactionData.serial_number || '',
        notes: transactionData.notes || ''
      }));
    }
  }, [transactionData]);

  if (!isOpen || !transactionData) return null;

  const handleInputChange = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  // Handle both single item and multiple items (grouped)
  const items = transactionData.items || [{
    equipment_name: transactionData.equipment_name,
    serial_number: transactionData.serial_number,
    notes: transactionData.notes
  }];

  // Debug: Log items to verify serial numbers are present
  console.log('PrintReceipt - Items to print:', items);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Accountability Form Agreement</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
            }
            .logo { 
              width: 120px; 
              height: auto; 
              margin: 0 auto 20px auto; 
              display: block; 
            }
            .title { 
              text-align: center; 
              font-size: 18px; 
              font-weight: bold; 
              margin: 20px 0; 
            }
            .employee-info { 
              margin: 20px 0; 
            }
            .employee-info div { 
              margin: 5px 0; 
            }
            .agreement-text { 
              margin: 20px 0; 
              text-align: justify; 
            }
            .agreement-text p { 
              margin: 10px 0; 
            }
            .equipment-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            .equipment-table th, 
            .equipment-table td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left; 
            }
            .equipment-table th { 
              background-color: #f5f5f5; 
              font-weight: bold; 
            }
            .signature-section { 
              margin-top: 40px; 
              display: flex; 
              justify-content: space-between; 
            }
            .signature-box { 
              text-align: center; 
              width: 200px; 
            }
            .signature-line { 
              border-bottom: 1px solid #000; 
              margin-bottom: 5px; 
              height: 40px; 
            }
            .signature-label { 
              font-size: 12px; 
              margin-top: 5px; 
            }
            .others-row { 
              font-style: italic; 
            }
            @media print { 
              body { margin: 0; } 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/images/Frame_89-removebg-preview.png" alt="iREPLY Logo" class="logo" />
          </div>

          <div class="title">ACCOUNTABILITY FORM AGREEMENT</div>

          <div class="employee-info">
            <div><strong>Employee Name:</strong> ${editableData.full_name}</div>
            <div><strong>Position:</strong> ${editableData.position}</div>
            <div><strong>Department:</strong> ${editableData.department}</div>
          </div>

          <div class="agreement-text">
            <p>
              I acknowledge receipt of the company-issued equipment listed below and agree to maintain it in good condition. 
              I understand that I am responsible for the proper care and return of this equipment upon termination of employment 
              or upon request by the company. I agree to report any damaged, destroyed, or lost items immediately and understand 
              that I may be held financially responsible for repair or replacement costs if the damage is due to negligence or misuse.
            </p>
            <p>
              I understand that failure to return the equipment in good condition may result in the company taking appropriate 
              action, including but not limited to withholding of final pay and clearance, and may be subject to formal legal action.
            </p>
          </div>

          <table class="equipment-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Equipment Name</th>
                <th>Serial Number</th>
                <th>Date Released</th>
                <th>Date Returned</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => {
                const dateReleased = item.date_released ? new Date(item.date_released).toLocaleDateString() : new Date().toLocaleDateString();
                const dateReturned = item.date_returned ? new Date(item.date_returned).toLocaleDateString() : '';
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.equipment_name || 'N/A'}</td>
                    <td>${item.serial_number || 'N/A'}</td>
                    <td>${dateReleased}</td>
                    <td>${dateReturned}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="others-row">
                <td colspan="2">Others/Notes:</td>
                <td colspan="3">${transactionData.notes || ''}</td>
              </tr>
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">${editableData.full_name}</div>
              <div class="signature-label">Employee's Signature over Printed Name</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">${editableData.it_admin}</div>
              <div class="signature-label">${editableData.it_admin_title}</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">${editableData.hr_lead}</div>
              <div class="signature-label">${editableData.hr_lead_title}</div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    
    if (onPrint) {
      onPrint();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-gray-200 transform transition-all duration-300 scale-100" style={{ boxShadow: '0 25px 50px -12px rgba(0, 100, 255, 0.4), 0 0 0 1px rgba(0, 100, 255, 0.1)' }}>
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-blue-100 shadow-lg">
                <Printer className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Print Accountability Form
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isEditing ? 'Edit the form details before printing' : 'Review the accountability form details before printing'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-green-100 rounded-full transition-colors text-green-600"
                  title="Save changes"
                >
                  <Save className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600"
                  title="Edit form"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-96 overflow-y-auto">
          {/* Form Preview */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="text-center mb-6">
              <img 
                src="/images/Frame_89-removebg-preview.png" 
                alt="iREPLY Logo" 
                className="w-24 h-auto mx-auto mb-4"
              />
              <div className="text-lg font-semibold text-gray-900">ACCOUNTABILITY FORM AGREEMENT</div>
            </div>

            <div className="space-y-4">
              {/* Employee Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Employee Information
                </h4>
                <div className="bg-white rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Employee Name:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm font-medium w-48"
                      />
                    ) : (
                      <span className="font-medium">{editableData.full_name}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Position:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm font-medium w-48"
                      />
                    ) : (
                      <span className="font-medium">{editableData.position}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Department:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm font-medium w-48"
                      />
                    ) : (
                      <span className="font-medium">{editableData.department}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Table Preview */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Equipment List ({items.length} {items.length === 1 ? 'item' : 'items'})
                </h4>

                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="text-sm text-gray-600 mb-2">Equipment to be released:</div>
                  {items.map((item, index) => {
                    const dateReleased = item.date_released ? new Date(item.date_released).toLocaleDateString() : new Date().toLocaleDateString();
                    const dateReturned = item.date_returned ? new Date(item.date_returned).toLocaleDateString() : null;
                    
                    return (
                      <div key={index} className="border-l-2 border-blue-500 pl-3 py-1">
                        <div className="font-medium">{index + 1}. {item.equipment_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">Serial: {item.serial_number || 'N/A'}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Released: {dateReleased}
                          {dateReturned && ` | Returned: ${dateReturned}`}
                        </div>
                      </div>
                    );
                  })}
                  {transactionData.notes && (
                    <div className="text-sm text-gray-500 mt-2 pt-2 border-t">
                      <strong>Notes:</strong> {transactionData.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Section */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Hash className="h-4 w-4 mr-2" />
                  Signatures
                </h4>
                <div className="bg-white rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Employee</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editableData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      ) : (
                        <div className="text-sm font-medium">{editableData.full_name}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">IT Admin</div>
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editableData.it_admin}
                            onChange={(e) => handleInputChange('it_admin', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                          <input
                            type="text"
                            value={editableData.it_admin_title}
                            onChange={(e) => handleInputChange('it_admin_title', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center"
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-medium">
                          <div>{editableData.it_admin}</div>
                          <div className="text-xs text-gray-500">{editableData.it_admin_title}</div>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">HR Lead</div>
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editableData.hr_lead}
                            onChange={(e) => handleInputChange('hr_lead', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                          <input
                            type="text"
                            value={editableData.hr_lead_title}
                            onChange={(e) => handleInputChange('hr_lead_title', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center"
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-medium">
                          <div>{editableData.hr_lead}</div>
                          <div className="text-xs text-gray-500">{editableData.hr_lead_title}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Print Accountability Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintReceipt;