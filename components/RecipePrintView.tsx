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
      const jsPDF = (await import('jspdf')).default;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, fontSize: number, fontStyle: string = 'normal'): number => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, x, y);
          y += lineHeight;
        });
        return y;
      };

      // Header with logo
      pdf.setFillColor(5, 150, 105); // emerald-600
      pdf.roundedRect(margin, yPos, 10, 10, 2, 2, 'F');

      // Logo text
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.text('Kiwi', margin + 14, yPos + 7);
      pdf.setTextColor(5, 150, 105); // emerald-600
      pdf.text('MealPlanner', margin + 28, yPos + 7);

      yPos += 15;

      // Header line
      pdf.setDrawColor(5, 150, 105);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Recipe Title
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      yPos = addWrappedText(meal.name, margin, yPos, contentWidth, 10, 24, 'bold');
      yPos += 2;

      // Description
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'italic');
      yPos = addWrappedText(meal.description, margin, yPos, contentWidth, 6, 12, 'italic');
      yPos += 8;

      // Recipe Image (if available)
      if (meal.imageUrl) {
        try {
          // For base64 images
          if (meal.imageUrl.startsWith('data:')) {
            const imgHeight = 60;
            if (yPos + imgHeight > pageHeight - margin) {
              pdf.addPage();
              yPos = margin;
            }
            pdf.addImage(meal.imageUrl, 'JPEG', margin, yPos, contentWidth, imgHeight);
            yPos += imgHeight + 10;
          }
        } catch (imgError) {
          console.warn('Could not add image to PDF:', imgError);
        }
      }

      // Ingredients Section
      pdf.setTextColor(5, 150, 105);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text('Ingredients', margin, yPos);
      yPos += 3;
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Ingredients list
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      meal.ingredients.forEach((ingredient) => {
        if (yPos > pageHeight - 15) {
          pdf.addPage();
          yPos = margin;
        }
        // Bullet point
        pdf.setFillColor(5, 150, 105);
        pdf.circle(margin + 2, yPos - 1.5, 1, 'F');
        // Ingredient text
        yPos = addWrappedText(ingredient, margin + 8, yPos, contentWidth - 8, 5, 11, 'normal');
        yPos += 2;
      });
      yPos += 5;

      // Instructions Section
      pdf.setTextColor(5, 150, 105);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text('Instructions', margin, yPos);
      yPos += 3;
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Instructions text
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      yPos = addWrappedText(meal.instructions, margin, yPos, contentWidth, 5.5, 11, 'normal');
      yPos += 10;

      // Disclaimer box
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = margin;
      }
      const disclaimerText = 'Disclaimer: This recipe is provided for informational purposes only. Please check all ingredients for potential allergens and adjust portions as needed. Cooking times may vary. Always ensure food is properly cooked before consuming.';

      // Calculate disclaimer height
      pdf.setFontSize(9);
      const disclaimerLines = pdf.splitTextToSize(disclaimerText, contentWidth - 12);
      const disclaimerHeight = disclaimerLines.length * 4 + 8;

      // Draw disclaimer background
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.roundedRect(margin, yPos, contentWidth, disclaimerHeight, 2, 2, 'F');

      // Left border accent
      pdf.setFillColor(148, 163, 184); // slate-400
      pdf.rect(margin, yPos, 1, disclaimerHeight, 'F');

      // Disclaimer text
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      let disclaimerY = yPos + 5;
      disclaimerLines.forEach((line: string) => {
        pdf.text(line, margin + 6, disclaimerY);
        disclaimerY += 4;
      });
      yPos += disclaimerHeight + 10;

      // Footer
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Powered by ', margin + (contentWidth / 2) - 25, yPos);
      pdf.setTextColor(5, 150, 105);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Kiwi Meal Planner', margin + (contentWidth / 2) - 2, yPos);

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
