import React from 'react';
import { Printer, X, Package, User, Briefcase, Calendar, Hash } from 'lucide-react';

const PrintReceipt = ({ 
  isOpen, 
  onClose, 
  transactionData,
  onPrint
}) => {
  if (!isOpen || !transactionData) return null;

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
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 30px; 
            }
            .logo { 
              font-size: 24px; 
              font-weight: bold; 
              color: #2563eb; 
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
            <div class="logo">iREPLY</div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #666;">done</div>
            </div>
          </div>

          <div class="title">ACCOUNTABILITY FORM AGREEMENT</div>

          <div class="employee-info">
            <div><strong>Employee Name:</strong> ${transactionData.full_name}</div>
            <div><strong>Position:</strong> ${transactionData.position}</div>
            <div><strong>Department:</strong> ${transactionData.department || 'IT Department'}</div>
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
                <th>Item</th>
                <th>Description</th>
                <th>Serial Number</th>
                <th>Date Released</th>
                <th>Date Returned</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Laptop</td>
                <td>${transactionData.equipment_name}</td>
                <td>${transactionData.serial_number || 'N/A'}</td>
                <td>${new Date().toLocaleDateString()}</td>
                <td></td>
              </tr>
              <tr>
                <td>Mouse</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Keyboard</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Headset</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>UPS</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Internet Broadband</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr class="others-row">
                <td>Others:</td>
                <td>${transactionData.notes || ''}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">${transactionData.full_name}</div>
              <div class="signature-label">Employee's Signature over Printed Name</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Arvin D. Salas</div>
              <div class="signature-label">IT Administrator</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">MAUMondres/PMagdadaro</div>
              <div class="signature-label">Senior IT Consultant/HR Lead</div>
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-gray-200 transform transition-all duration-300 scale-100">
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
                  Review the accountability form details before printing
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-96 overflow-y-auto">
          {/* Form Preview */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-blue-600 mb-2">iREPLY</div>
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employee Name:</span>
                    <span className="font-medium">{transactionData.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Position:</span>
                    <span className="font-medium">{transactionData.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{transactionData.department || 'IT Department'}</span>
                  </div>
                </div>
              </div>

              {/* Equipment Table Preview */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Equipment List
                </h4>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Equipment to be released:</div>
                  <div className="font-medium">{transactionData.equipment_name}</div>
                  <div className="text-sm text-gray-500">Serial: {transactionData.serial_number || 'N/A'}</div>
                  {transactionData.notes && (
                    <div className="text-sm text-gray-500 mt-1">Notes: {transactionData.notes}</div>
                  )}
                </div>
              </div>

              {/* Agreement Preview */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Agreement Terms
                </h4>
                <div className="bg-white rounded-lg p-4 text-sm text-gray-600">
                  <p className="mb-2">
                    Employee acknowledges receipt of company-issued equipment and agrees to maintain it in good condition. 
                    Employee is responsible for proper care and return of equipment upon termination or request.
                  </p>
                  <p>
                    Failure to return equipment in good condition may result in appropriate action including withholding 
                    of final pay and clearance, and may be subject to formal legal action.
                  </p>
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