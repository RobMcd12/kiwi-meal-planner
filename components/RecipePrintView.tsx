import React, { useRef } from 'react';
import { X, Printer, Download, ChefHat, Clock, Users } from 'lucide-react';
import type { Meal } from '../types';

interface RecipePrintViewProps {
  meal: Meal;
  onClose: () => void;
}

const RecipePrintView: React.FC<RecipePrintViewProps> = ({ meal, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print recipes');
      return;
    }

    // Write the print content with styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${meal.name} - Kiwi Meal Planner</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 24px 32px;
              max-width: 800px;
              margin: 0 auto;
            }

            .header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 20px;
              padding-bottom: 12px;
              border-bottom: 2px solid #059669;
            }

            .logo {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .logo-icon {
              width: 40px;
              height: 40px;
              background: #059669;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .logo-icon svg {
              width: 24px;
              height: 24px;
              fill: white;
            }

            .logo-text {
              font-weight: 700;
              font-size: 20px;
              color: #1e293b;
            }

            .logo-text span {
              color: #059669;
            }

            .recipe-title {
              font-size: 28px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 8px;
            }

            .recipe-description {
              font-size: 16px;
              color: #64748b;
              font-style: italic;
              margin-bottom: 24px;
            }

            .recipe-image {
              width: 100%;
              max-height: 300px;
              object-fit: cover;
              border-radius: 12px;
              margin-bottom: 24px;
            }

            .section {
              margin-bottom: 24px;
            }

            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #059669;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            }

            .ingredients-list {
              list-style: none;
            }

            .ingredients-list li {
              padding: 8px 0;
              border-bottom: 1px dashed #e2e8f0;
              display: flex;
              align-items: flex-start;
              gap: 12px;
            }

            .ingredients-list li:last-child {
              border-bottom: none;
            }

            .bullet {
              width: 8px;
              height: 8px;
              background: #059669;
              border-radius: 50%;
              flex-shrink: 0;
              margin-top: 8px;
            }

            .instructions {
              white-space: pre-wrap;
              line-height: 1.8;
            }

            .disclaimer {
              margin-top: 32px;
              padding: 12px 16px;
              background: #f8fafc;
              border-radius: 8px;
              border-left: 3px solid #94a3b8;
              font-size: 11px;
              color: #64748b;
              line-height: 1.5;
            }

            .footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 13px;
            }

            .footer a {
              color: #059669;
              text-decoration: none;
              font-weight: 600;
            }

            .footer a:hover {
              text-decoration: underline;
            }

            @media print {
              body {
                padding: 20px;
              }

              .recipe-image {
                max-height: 250px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  const handleDownloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      if (!printRef.current) return;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${meal.name.replace(/[^a-z0-9]/gi, '_')}_recipe.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try printing instead.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-xl animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Print Recipe</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Printer size={18} />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download size={18} />
              PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div
            ref={printRef}
            className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto"
          >
            {/* Branding Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #059669' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', background: '#059669', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                    <line x1="6" y1="17" x2="18" y2="17"/>
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: '20px', color: '#1e293b' }}>
                  Kiwi<span style={{ color: '#059669' }}>MealPlanner</span>
                </span>
              </div>
            </div>

            {/* Recipe Title */}
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{meal.name}</h1>
            <p style={{ fontSize: '16px', color: '#64748b', fontStyle: 'italic', marginBottom: '24px' }}>{meal.description}</p>

            {/* Recipe Image */}
            {meal.imageUrl && (
              <img
                src={meal.imageUrl}
                alt={meal.name}
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px', marginBottom: '24px' }}
                crossOrigin="anonymous"
              />
            )}

            {/* Ingredients */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#059669', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Ingredients</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {meal.ingredients.map((ingredient, idx) => (
                  <li key={idx} style={{ padding: '8px 0', borderBottom: idx < meal.ingredients.length - 1 ? '1px dashed #e2e8f0' : 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#059669', borderRadius: '50%', flexShrink: 0, marginTop: '8px' }}></span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#059669', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Instructions</h2>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{meal.instructions}</div>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: '32px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #94a3b8', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
              <strong>Disclaimer:</strong> This recipe is provided for informational purposes only.
              Please check all ingredients for potential allergens and adjust portions as needed.
              Cooking times may vary. Always ensure food is properly cooked before consuming.
            </div>

            {/* Footer */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              <p>
                Powered by <a href="https://kiwimealplanner.com" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600 }}>Kiwi Meal Planner</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipePrintView;
